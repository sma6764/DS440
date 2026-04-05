<?php
// Check-me-up Helper Functions — DS440 Group 12

/**
 * Send standardized JSON response
 * 
 * @param bool $success - Whether the operation was successful
 * @param string $message - Response message
 * @param mixed $data - Optional data to include in response
 * @param string|null $code - Optional machine-readable error code
 * @return void
 */
function sendResponse($success, $message, $data = null, $code = null) {
    http_response_code($success ? 200 : 400);
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }

    if ($code !== null) {
        $response['code'] = $code;
    }
    
    echo json_encode($response);
    exit();
}

/**
 * Validate and normalize raw user input.
 *
 * @param mixed $data - Input to validate
 * @return string - Normalized input
 */
function validateInput($data) {
    $data = trim((string)$data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Sanitize user input
 * 
 * @param mysqli $conn - Database connection
 * @param string $input - Input to sanitize
 * @return string - Sanitized input
 */
function sanitize($conn, $input) {
    $input = validateInput($input);
    $input = preg_replace('/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|REPLACE|EXEC|MERGE|SLEEP|BENCHMARK|FROM|WHERE|JOIN|TABLE|DATABASE)\b/i', '', $input);
    return mysqli_real_escape_string($conn, $input);
}

/**
 * Check if user is logged in
 * 
 * @return bool - True if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Require user to be logged in or exit with error
 * 
 * @return void
 */
function requireLogin() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
        sendResponse(false, "Unauthorized. Please log in.");
        exit();
    }
}

/**
 * Require specific role or exit with error
 * 
 * @param string $role - Required role (admin, doctor, patient)
 * @return void
 */
function requireRole($role) {
    requireLogin();
    
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== $role) {
        sendResponse(false, "Forbidden. You do not have permission to access this resource.");
    }
}

/**
 * Normalize insurance company names to canonical US providers.
 * Handles legacy slugs/aliases (including old UAE labels) for backward compatibility.
 */
function normalizeInsuranceCompany($insuranceCompany) {
    if ($insuranceCompany === null) {
        return null;
    }

    $value = trim((string)$insuranceCompany);
    if ($value === '') {
        return null;
    }

    $key = strtolower(preg_replace('/\s+/', ' ', $value));

    $map = [
        // Canonical US names
        'blue cross blue shield' => 'Blue Cross Blue Shield',
        'aetna' => 'Aetna',
        'unitedhealthcare' => 'UnitedHealthcare',
        'united healthcare' => 'UnitedHealthcare',
        'cigna' => 'Cigna',
        'humana' => 'Humana',
        'medicare' => 'Medicare',
        'medicaid' => 'Medicaid',
        'kaiser permanente' => 'Kaiser Permanente',
        'anthem' => 'Anthem',
        'oscar health' => 'Oscar Health',

        // Frontend select slugs
        'blue-cross' => 'Blue Cross Blue Shield',
        'unitedhealthcare' => 'UnitedHealthcare',
        'kaiser' => 'Kaiser Permanente',
        'oscar' => 'Oscar Health',
        'none' => null,
        'no insurance' => null,

        // Legacy/old provider aliases
        'daman' => 'Blue Cross Blue Shield',
        'thiqa' => 'Medicare',
        'oman insurance' => 'Aetna',
        'adnic' => 'UnitedHealthcare',
        'takaful emarat' => 'Cigna',
        'mednet' => 'Humana',
        'nas' => 'Anthem',
        'nextcare' => 'Oscar Health',
        'axa gulf' => 'Aetna',
        'saico' => 'Kaiser Permanente',
        'axa' => 'Aetna',
        'oman' => 'Aetna',
        'al-ain' => 'Kaiser Permanente',
        'albuhaira' => 'Anthem',
        'albuhaira national insurance' => 'Anthem'
    ];

    if (array_key_exists($key, $map)) {
        return $map[$key];
    }

    return $value;
}
?>
