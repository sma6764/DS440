<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed');
}

$userId = (int)$_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

$currentPassword = isset($input['current_password']) ? validateInput($input['current_password']) : '';
$newPassword = isset($input['new_password']) ? validateInput($input['new_password']) : '';
$confirmPassword = isset($input['confirm_password']) ? validateInput($input['confirm_password']) : '';

if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    $conn->close();
    sendResponse(false, 'All password fields are required');
}

if ($newPassword !== $confirmPassword) {
    $conn->close();
    sendResponse(false, 'New password and confirmation do not match');
}

if (strlen($newPassword) < 8) {
    $conn->close();
    sendResponse(false, 'New password must be at least 8 characters long');
}

$stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare password lookup');
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, 'User not found');
}

$user = $result->fetch_assoc();
$stmt->close();

if (!password_verify($currentPassword, $user['password_hash'])) {
    $conn->close();
    sendResponse(false, 'Current password is incorrect');
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
$updateStmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
if (!$updateStmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare password update');
}

$updateStmt->bind_param('si', $newHash, $userId);
$updateStmt->execute();
$updateStmt->close();

$conn->close();
sendResponse(true, 'Password updated successfully');
?>