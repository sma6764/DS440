<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';

function recordLoginAttempt($conn, $email, $ip) {
    $stmt = $conn->prepare('INSERT INTO login_attempts (email, ip_address) VALUES (?, ?)');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ss', $email, $ip);
    $result = $stmt->execute();
    $stmt->close();

    return $result;
}

function clearLoginAttempts($conn, $email) {
    $stmt = $conn->prepare('DELETE FROM login_attempts WHERE email = ?');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $email);
    $result = $stmt->execute();
    $stmt->close();

    return $result;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, "Method not allowed");
}

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Extract fields from request
$email = isset($data['email']) ? validateInput($data['email']) : '';
$password = isset($data['password']) ? validateInput($data['password']) : '';
$rawPassword = isset($data['password']) ? (string)$data['password'] : '';

// Validate that email and password are present and not empty
if (empty($email) || empty($password)) {
    sendResponse(false, "Please enter both email and password.", null, "MISSING_FIELDS");
}

// Check login attempts with try/catch in case table doesn't exist yet
try {
    $attemptStmt = $conn->prepare('SELECT COUNT(*) as attempts FROM login_attempts WHERE (email = ? OR ip_address = ?) AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)');
    if ($attemptStmt) {
        $attemptStmt->bind_param('ss', $email, $ip);
        $attemptStmt->execute();
        $attemptResult = $attemptStmt->get_result()->fetch_assoc();
        $attemptStmt->close();

        if ((int)($attemptResult['attempts'] ?? 0) >= 5) {
            $conn->close();
            sendResponse(false, "Too many failed attempts. Please wait 15 minutes before trying again.", null, "RATE_LIMITED");
        }
    }
} catch (Exception $e) {
    error_log("Login attempts table error: " . $e->getMessage());
    // Continue with login if attempts table fails
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    recordLoginAttempt($conn, $email, $ip);
    sendResponse(false, "Invalid email or password.", null, "INVALID_CREDENTIALS");
}

// Query the users table for the email
$stmt = $conn->prepare("SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.insurance_company, d.is_active AS doctor_is_active FROM users u LEFT JOIN doctors d ON d.user_id = u.id WHERE u.email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

// Check if user exists
if ($result->num_rows === 0) {
    recordLoginAttempt($conn, $email, $ip);
    $stmt->close();
    $conn->close();
    sendResponse(false, "Invalid email or password.", null, "INVALID_CREDENTIALS");
}

$user = $result->fetch_assoc();
$stmt->close();

$normalizedInsurance = normalizeInsuranceCompany($user['insurance_company']);

// Check if doctor account is inactive
if ($user['role'] === 'doctor' && isset($user['doctor_is_active']) && (int)$user['doctor_is_active'] === 0) {
    recordLoginAttempt($conn, $email, $ip);
    $conn->close();
    sendResponse(false, "Invalid email or password.", null, "INVALID_CREDENTIALS");
}

// Verify password
if (!password_verify($rawPassword, $user['password_hash'])) {
    recordLoginAttempt($conn, $email, $ip);
    $conn->close();
    sendResponse(false, "Invalid email or password.", null, "INVALID_CREDENTIALS");
}

clearLoginAttempts($conn, $email);

// Login successful - store user data in session
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['user_role'] = $user['role'];
$_SESSION['user_insurance'] = $normalizedInsurance;

// Close database connection
$conn->close();

// Return success response with user data
sendResponse(true, "Login successful", [
    'user_id' => $user['id'],
    'name' => $user['full_name'],
    'email' => $user['email'],
    'role' => $user['role'],
    'insurance' => $normalizedInsurance
]);
?>
