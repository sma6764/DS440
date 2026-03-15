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
$phone = isset($data['phone']) ? trim($data['phone']) : '';
$date_of_birth = isset($data['date_of_birth']) ? trim($data['date_of_birth']) : '';
$gender = isset($data['gender']) ? trim($data['gender']) : '';
$password = isset($data['password']) ? $data['password'] : '';
$confirm_password = isset($data['confirm_password']) ? $data['confirm_password'] : '';
$insurance_company = isset($data['insurance_company']) ? trim($data['insurance_company']) : null;

// Validate all required fields are present and not empty
if (empty($email) || empty($phone) || empty($date_of_birth) || empty($gender) || empty($password) || empty($confirm_password)) {
    sendResponse(false, "All fields are required");
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, "Invalid email format");
}

// Validate passwords match
if ($password !== $confirm_password) {
    sendResponse(false, "Passwords do not match");
}

// Validate password length
if (strlen($password) < 8) {
    sendResponse(false, "Password must be at least 8 characters");
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $stmt->close();
    sendResponse(false, "Email already registered");
}
$stmt->close();

// Hash the password
$password_hash = password_hash($password, PASSWORD_BCRYPT);

// Insert new user into database
$stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password_hash, date_of_birth, gender, role, insurance_company) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

$full_name = ''; // Will be added to profile later
$role = 'patient';

$stmt->bind_param("ssssssss", $full_name, $email, $phone, $password_hash, $date_of_birth, $gender, $role, $insurance_company);

if ($stmt->execute()) {
    $stmt->close();
    $conn->close();
    sendResponse(true, "Account created successfully");
} else {
    $stmt->close();
    $conn->close();
    sendResponse(false, "Registration failed. Please try again.");
}
?>
