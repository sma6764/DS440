<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'doctor') {
    sendResponse(false, "Forbidden. Doctor access required.", null, "FORBIDDEN");
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
$bio = validateInput($input['bio'] ?? '');

if ($fullName === '' || $phone === '' || $bio === '') {
    sendResponse(false, 'All fields are required');
}

if (!preg_match('/^[0-9+\s\-()+]{7,20}$/', $phone)) {
    sendResponse(false, 'Phone number can only contain numbers, spaces, +, parentheses, and dashes');
}

$userId = (int)$_SESSION['user_id'];

$conn->begin_transaction();

$userStmt = $conn->prepare('UPDATE users SET full_name = ?, phone = ? WHERE id = ?');
if (!$userStmt) {
    $conn->rollback();
    $conn->close();
    sendResponse(false, 'Failed to prepare profile update');
}

$userStmt->bind_param('ssi', $fullName, $phone, $userId);
if (!$userStmt->execute()) {
    $userStmt->close();
    $conn->rollback();
    $conn->close();
    sendResponse(false, 'Failed to update profile');
}
$userStmt->close();

$doctorStmt = $conn->prepare('UPDATE doctors SET bio = ? WHERE user_id = ?');
if (!$doctorStmt) {
    $conn->rollback();
    $conn->close();
    sendResponse(false, 'Failed to prepare doctor bio update');
}

$doctorStmt->bind_param('si', $bio, $userId);
if (!$doctorStmt->execute()) {
    $doctorStmt->close();
    $conn->rollback();
    $conn->close();
    sendResponse(false, 'Failed to update profile');
}
$doctorStmt->close();

$conn->commit();

$_SESSION['user_name'] = $fullName;

$conn->close();
sendResponse(true, 'Profile updated successfully');
?>