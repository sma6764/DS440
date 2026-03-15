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
    sendResponse(false, "Email and password are required");
}

// Query the users table for the email
$stmt = $conn->prepare("SELECT id, full_name, email, password_hash, role, insurance_company FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

// Check if user exists
if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, "Invalid email or password");
}

$user = $result->fetch_assoc();
$stmt->close();

// Verify password
if (!password_verify($password, $user['password_hash'])) {
    $conn->close();
    sendResponse(false, "Invalid email or password");
}

// Login successful - store user data in session
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['user_role'] = $user['role'];
$_SESSION['user_insurance'] = $user['insurance_company'];

// Close database connection
$conn->close();

// Return success response with user data
sendResponse(true, "Login successful", [
    'user_id' => $user['id'],
    'name' => $user['full_name'],
    'email' => $user['email'],
    'role' => $user['role'],
    'insurance' => $user['insurance_company']
]);
?>
