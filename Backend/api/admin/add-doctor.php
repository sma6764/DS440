<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();

if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    sendResponse(false, 'Forbidden. Admin access required.');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed');
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    sendResponse(false, 'Invalid request payload');
}

$fullName = trim($payload['full_name'] ?? '');
$email = trim($payload['email'] ?? '');
$password = (string)($payload['password'] ?? '');
$confirmPassword = (string)($payload['confirm_password'] ?? '');
$phone = trim($payload['phone'] ?? '');
$dateOfBirth = trim($payload['date_of_birth'] ?? '');
$gender = trim($payload['gender'] ?? '');
$specialistId = (int)($payload['specialist_id'] ?? 0);
$branchId = (int)($payload['branch_id'] ?? 0);
$bio = trim($payload['bio'] ?? '');
$rating = $payload['rating'] ?? null;
$rating = is_numeric($rating) ? (float)$rating : null;

if (
    $fullName === '' || $email === '' || $password === '' || $confirmPassword === '' ||
    $phone === '' || $dateOfBirth === '' || $gender === '' ||
    $specialistId <= 0 || $branchId <= 0 || $bio === '' || $rating === null
) {
    sendResponse(false, 'All fields are required');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format');
}

if ($password !== $confirmPassword) {
    sendResponse(false, 'Passwords do not match');
}

if ($rating < 0 || $rating > 5) {
    sendResponse(false, 'Rating must be between 0.0 and 5.0');
}

$allowedGenders = ['Male', 'Female', 'Prefer not to say'];
if (!in_array($gender, $allowedGenders, true)) {
    sendResponse(false, 'Invalid gender value');
}

$checkEmailStmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$checkEmailStmt->bind_param('s', $email);
$checkEmailStmt->execute();
$emailResult = $checkEmailStmt->get_result();
if ($emailResult && $emailResult->num_rows > 0) {
    $checkEmailStmt->close();
    $conn->close();
    sendResponse(false, 'Email already exists');
}
$checkEmailStmt->close();

$checkSpecialistStmt = $conn->prepare('SELECT id FROM specialists WHERE id = ? LIMIT 1');
$checkSpecialistStmt->bind_param('i', $specialistId);
$checkSpecialistStmt->execute();
$specialistExists = $checkSpecialistStmt->get_result()->num_rows > 0;
$checkSpecialistStmt->close();
if (!$specialistExists) {
    $conn->close();
    sendResponse(false, 'Selected specialist does not exist');
}

$checkBranchStmt = $conn->prepare('SELECT id FROM branches WHERE id = ? LIMIT 1');
$checkBranchStmt->bind_param('i', $branchId);
$checkBranchStmt->execute();
$branchExists = $checkBranchStmt->get_result()->num_rows > 0;
$checkBranchStmt->close();
if (!$branchExists) {
    $conn->close();
    sendResponse(false, 'Selected branch does not exist');
}

$conn->begin_transaction();

try {
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if ($passwordHash === false) {
        throw new Exception('Failed to hash password');
    }

    $insertUserStmt = $conn->prepare(
        'INSERT INTO users (full_name, email, phone, password_hash, date_of_birth, gender, role) VALUES (?, ?, ?, ?, ?, ?, "doctor")'
    );
    $insertUserStmt->bind_param('ssssss', $fullName, $email, $phone, $passwordHash, $dateOfBirth, $gender);

    if (!$insertUserStmt->execute()) {
        throw new Exception('Failed to create doctor user account');
    }

    $userId = (int)$conn->insert_id;
    $insertUserStmt->close();

    $insertDoctorStmt = $conn->prepare(
        'INSERT INTO doctors (user_id, specialist_id, branch_id, bio, rating) VALUES (?, ?, ?, ?, ?)'
    );
    $insertDoctorStmt->bind_param('iiisd', $userId, $specialistId, $branchId, $bio, $rating);

    if (!$insertDoctorStmt->execute()) {
        throw new Exception('Failed to create doctor profile');
    }

    $insertDoctorStmt->close();
    $conn->commit();

    $conn->close();
    sendResponse(true, 'Doctor added successfully');
} catch (Exception $exception) {
    $conn->rollback();
    $conn->close();
    sendResponse(false, $exception->getMessage());
}
?>
