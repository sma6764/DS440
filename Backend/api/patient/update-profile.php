<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'patient') {
    sendResponse(false, "Forbidden. Patient access required.", null, "FORBIDDEN");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(false, 'Method not allowed');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    sendResponse(false, 'Invalid request payload');
}

$fullName = validateInput($input['full_name'] ?? '');
$phone = validateInput($input['phone'] ?? '');
$dateOfBirth = validateInput($input['date_of_birth'] ?? '');
$gender = validateInput($input['gender'] ?? '');
$insuranceCompany = validateInput($input['insurance_company'] ?? '');

if ($fullName === '' || $phone === '' || $dateOfBirth === '' || $gender === '' || $insuranceCompany === '') {
    $conn->close();
    sendResponse(false, 'All fields are required');
}

if (!preg_match('/^[0-9+\s\-()+]{7,20}$/', $phone)) {
    $conn->close();
    sendResponse(false, 'Phone number can only contain numbers, spaces, +, parentheses, and dashes');
}

$dateObj = DateTime::createFromFormat('Y-m-d', $dateOfBirth);
if (!$dateObj || $dateObj->format('Y-m-d') !== $dateOfBirth) {
    $conn->close();
    sendResponse(false, 'Invalid date of birth format');
}

$allowedGenders = ['Male', 'Female', 'Prefer not to say'];
if (!in_array($gender, $allowedGenders, true)) {
    $conn->close();
    sendResponse(false, 'Invalid gender value');
}

$normalizedInsurance = normalizeInsuranceCompany($insuranceCompany);
if ($normalizedInsurance === null || trim($normalizedInsurance) === '') {
    $conn->close();
    sendResponse(false, 'Insurance company is required');
}

$userId = (int)$_SESSION['user_id'];

$stmt = $conn->prepare('UPDATE users SET full_name = ?, phone = ?, date_of_birth = ?, gender = ?, insurance_company = ? WHERE id = ?');
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare profile update');
}

$stmt->bind_param('sssssi', $fullName, $phone, $dateOfBirth, $gender, $normalizedInsurance, $userId);
$updated = $stmt->execute();
$stmt->close();

if (!$updated) {
    $conn->close();
    sendResponse(false, 'Failed to update profile');
}

$_SESSION['user_name'] = $fullName;
$_SESSION['user_insurance'] = $normalizedInsurance;

$conn->close();
sendResponse(true, 'Profile updated successfully');
?>