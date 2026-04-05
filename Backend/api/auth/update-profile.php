<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();

$method = $_SERVER['REQUEST_METHOD'];
$userId = (int)$_SESSION['user_id'];

if ($method === 'GET') {
    $stmt = $conn->prepare('SELECT full_name, email, phone FROM users WHERE id = ? LIMIT 1');
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare profile query');
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
    $conn->close();

    sendResponse(true, 'Profile retrieved', [
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'phone' => $user['phone']
    ]);
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $fullName = isset($input['full_name']) ? validateInput($input['full_name']) : '';
    $email = isset($input['email']) ? validateInput($input['email']) : '';
    $phone = isset($input['phone']) ? validateInput($input['phone']) : '';

    if ($fullName === '' || $email === '') {
        $conn->close();
        sendResponse(false, 'Full name and email are required');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $conn->close();
        sendResponse(false, 'Please provide a valid email address');
    }

    if ($phone !== '' && !preg_match('/^[0-9+\s\-()+]{7,20}$/', $phone)) {
        $conn->close();
        sendResponse(false, 'Phone number can only contain numbers, spaces, +, parentheses, and dashes');
    }

    $emailCheck = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
    if (!$emailCheck) {
        $conn->close();
        sendResponse(false, 'Failed to validate email');
    }

    $emailCheck->bind_param('si', $email, $userId);
    $emailCheck->execute();
    $emailCheckResult = $emailCheck->get_result();
    $emailTaken = $emailCheckResult->num_rows > 0;
    $emailCheck->close();

    if ($emailTaken) {
        $conn->close();
        sendResponse(false, 'Email address is already in use');
    }

    $stmt = $conn->prepare('UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?');
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare profile update');
    }

    $stmt->bind_param('sssi', $fullName, $email, $phone, $userId);
    $stmt->execute();
    $stmt->close();

    $_SESSION['user_name'] = $fullName;
    $_SESSION['user_email'] = $email;

    $conn->close();
    sendResponse(true, 'Profile updated successfully', [
        'user_id' => $userId,
        'name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'role' => isset($_SESSION['user_role']) ? $_SESSION['user_role'] : null
    ]);
}

$conn->close();
sendResponse(false, 'Method not allowed');
?>