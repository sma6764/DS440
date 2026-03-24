<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, "Method not allowed");
}

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Extract fields from request
$email = isset($data['email']) ? trim($data['email']) : '';
$password = isset($data['password']) ? $data['password'] : '';

// Validate that email and password are present and not empty
if (empty($email) || empty($password)) {
    sendResponse(false, "Please enter both email and password.", null, "MISSING_FIELDS");
}

// Query the users table for the email
$stmt = $conn->prepare("SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.insurance_company, d.is_active AS doctor_is_active FROM users u LEFT JOIN doctors d ON d.user_id = u.id WHERE u.email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

// Check if user exists
if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, "No account found with this email address.", null, "EMAIL_NOT_FOUND");
}

$user = $result->fetch_assoc();
$stmt->close();

$normalizedInsurance = normalizeInsuranceCompany($user['insurance_company']);

// Check if doctor account is inactive
if ($user['role'] === 'doctor' && isset($user['doctor_is_active']) && (int)$user['doctor_is_active'] === 0) {
    $conn->close();
    sendResponse(false, "Your account has been deactivated. Please contact support.", null, "ACCOUNT_INACTIVE");
}

// Verify password
if (!password_verify($password, $user['password_hash'])) {
    $conn->close();
    sendResponse(false, "Incorrect password. Please try again.", null, "WRONG_PASSWORD");
}

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
