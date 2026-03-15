<?php
require_once '../config/cors.php';

// ── Gemini API Configuration ─────────────────────────────────────────────────
// Get your free API key at: https://aistudio.google.com/app/apikey
// Then replace the placeholder below with your actual key.
define('GEMINI_API_KEY', 'AIzaSyCIQGHulpA_8xY1MgoLL9TGhomZHFzUcBU');
define('GEMINI_MODEL',   'gemini-2.0-flash');
define('GEMINI_FALLBACK_MODELS', [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest'
]);
// ─────────────────────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

function parseRetryAfterSeconds(string $message): ?int {
    if (preg_match('/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i', $message, $matches)) {
        return (int)ceil((float)$matches[1]);
    }
    return null;
}

function classifySpecialistFromText(string $text): string {
    $text = strtolower($text);

    $groups = [
        'Neurologist' => ['headache', 'migraine', 'dizzy', 'vertigo', 'seizure', 'numbness', 'tingling', 'brain'],
        'Cardiologist' => ['chest pain', 'chest', 'heart', 'palpitation', 'shortness of breath', 'breathless', 'blood pressure'],
        'Dermatologist' => ['skin', 'rash', 'acne', 'itch', 'eczema', 'psoriasis', 'mole', 'hives'],
        'Pediatrician' => ['child', 'kid', 'baby', 'infant', 'toddler', 'my son', 'my daughter'],
        'Orthopedic' => ['back pain', 'back', 'knee', 'joint', 'bone', 'fracture', 'shoulder', 'hip', 'ankle', 'wrist', 'muscle']
    ];

    foreach ($groups as $specialist => $keywords) {
        foreach ($keywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return $specialist;
            }
        }
    }

    return 'General Practitioner';
}

function callGeminiModel(array $payload, string $model): array {
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model
         . ':generateContent?key=' . GEMINI_API_KEY;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    return [
        'response' => $response,
        'httpCode' => $httpCode,
        'curlError' => $curlError
    ];
}

$body = json_decode(file_get_contents('php://input'), true);
$messages = $body['messages'] ?? [];

if (empty($messages) || !is_array($messages)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No messages provided']);
    exit;
}

// Limit conversation history to last 20 turns to avoid token bloat
if (count($messages) > 20) {
    $messages = array_slice($messages, -20);
}

// Validate each message entry
foreach ($messages as $msg) {
    if (!isset($msg['role'], $msg['content']) ||
        !in_array($msg['role'], ['user', 'assistant'], true) ||
        !is_string($msg['content'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid message format']);
        exit;
    }
}

// System instruction sent once to guide Gemini's behaviour
$systemInstruction = [
    'parts' => [[
        'text' =>
        'You are a friendly AI health assistant for Check-me-up, a medical clinic with many branches.' .
        'Your job is to:' . "\n" .
        '1. Have a warm, empathetic conversation with the patient about their symptoms.' . "\n" .
        '2. Ask at most one or two clarifying questions if more detail is needed.' . "\n" .
        '3. Once you have enough information, recommend ONE of these available specialists:' . "\n" .
        '   - Neurologist (headaches, migraines, dizziness, seizures, neurological issues)' . "\n" .
        '   - Cardiologist (chest pain, heart palpitations, shortness of breath, blood pressure)' . "\n" .
        '   - Dermatologist (skin rashes, acne, eczema, psoriasis, hair or nail problems)' . "\n" .
        '   - Pediatrician (health concerns for children or infants)' . "\n" .
        '   - Orthopedic (bone, joint, muscle, back, spine or sports injury issues)' . "\n" .
        '   - General Practitioner (general illness, fever, cold, flu, or unclear symptoms)' . "\n\n" .
        'Important rules:' . "\n" .
        '- Keep responses concise (2-4 sentences max). Use plain text only - no markdown, no bold, no bullet points.' . "\n" .
        '- Never diagnose a specific medical condition. Only recommend which specialist to see.' . "\n" .
        '- Always recommend exactly ONE specialist in every response, even with limited information.' . "\n" .
        '- If details are limited, state this is a preliminary recommendation and optionally ask one short follow-up question.' . "\n" .
        '- Add this exact line at the very END of your response on its own line:' . "\n" .
        '  SPECIALIST_RECOMMENDATION: [specialist name]' . "\n" .
        '  Example: SPECIALIST_RECOMMENDATION: Neurologist' . "\n" .
        '- Include SPECIALIST_RECOMMENDATION in EVERY response.'
    ]]
];

// Convert conversation history to Gemini "contents" format
$contents = [];
foreach ($messages as $msg) {
    $contents[] = [
        'role'  => $msg['role'] === 'user' ? 'user' : 'model',
        'parts' => [['text' => $msg['content']]]
    ];
}

$payload = [
    'system_instruction' => $systemInstruction,
    'contents'           => $contents,
    'generationConfig'   => [
        'temperature'     => 0.7,
        'maxOutputTokens' => 512
    ]
];

$modelsToTry = array_values(array_unique(array_merge([GEMINI_MODEL], GEMINI_FALLBACK_MODELS)));
$response = false;
$httpCode = 0;
$curlError = '';
$lastErrorMessage = '';
$retryAfterSeconds = null;
$activeModel = null;

foreach ($modelsToTry as $model) {
    $activeModel = $model;
    $result = callGeminiModel($payload, $model);
    $response = $result['response'];
    $httpCode = $result['httpCode'];
    $curlError = $result['curlError'];

    if ($response === false) {
        $lastErrorMessage = 'Could not reach Gemini: ' . $curlError;
        break;
    }

    if ($httpCode === 200) {
        break;
    }

    $errData = json_decode($response, true);
    $errMsg  = $errData['error']['message'] ?? 'Gemini API returned HTTP ' . $httpCode;
    $lastErrorMessage = $errMsg;
    $retryAfterSeconds = parseRetryAfterSeconds($errMsg) ?? $retryAfterSeconds;

    // If this model is rate-limited, try the next fallback model.
    if ($httpCode === 429) {
        continue;
    }

    // Non-rate-limit errors won't be solved by switching models.
    break;
}

if ($response === false) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => 'Could not reach Gemini: ' . $curlError,
        'upstream_status' => 0
    ]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => $lastErrorMessage ?: ('Gemini API returned HTTP ' . $httpCode),
        'upstream_status' => $httpCode,
        'rate_limited' => $httpCode === 429,
        'retry_after_seconds' => $retryAfterSeconds,
        'model' => $activeModel
    ]);
    exit;
}

$data      = json_decode($response, true);
$replyText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

if ($replyText === '') {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => 'Empty response from Gemini',
        'upstream_status' => 200
    ]);
    exit;
}

// Extract specialist recommendation tag if present, then strip it from visible text
$specialist = null;
if (preg_match('/SPECIALIST_RECOMMENDATION:\s*(.+)/i', $replyText, $matches)) {
    $specialist = trim($matches[1]);
    $replyText  = trim(preg_replace('/SPECIALIST_RECOMMENDATION:\s*.+/i', '', $replyText));
}

// Safety net: if the model omits the recommendation tag, classify from latest user input.
if ($specialist === null) {
    $lastUserMessage = '';
    for ($i = count($messages) - 1; $i >= 0; $i--) {
        if (($messages[$i]['role'] ?? '') === 'user') {
            $lastUserMessage = (string)$messages[$i]['content'];
            break;
        }
    }
    $specialist = classifySpecialistFromText($lastUserMessage);
}

echo json_encode([
    'success'    => true,
    'reply'      => $replyText,
    'specialist' => $specialist
]);
