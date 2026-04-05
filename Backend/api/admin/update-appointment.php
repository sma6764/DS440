<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    sendResponse(false, "Forbidden. Admin access required.", null, "FORBIDDEN");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(false, 'Method not allowed');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    sendResponse(false, 'Invalid request payload');
}

$appointmentId = isset($input['appointment_id']) ? (int)validateInput($input['appointment_id']) : 0;
$newStatus = validateInput($input['status'] ?? $input['new_status'] ?? '');
$allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

if ($appointmentId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
    sendResponse(false, 'Invalid appointment update request');
}

$checkStmt = $conn->prepare('SELECT id FROM appointments WHERE id = ? LIMIT 1');
if (!$checkStmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare appointment lookup');
}

$checkStmt->bind_param('i', $appointmentId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();
if (!$checkResult || $checkResult->num_rows === 0) {
    $checkStmt->close();
    $conn->close();
    sendResponse(false, 'Appointment not found');
}
$checkStmt->close();

$updateStmt = $conn->prepare('UPDATE appointments SET status = ? WHERE id = ?');
if (!$updateStmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare appointment update');
}

$updateStmt->bind_param('si', $newStatus, $appointmentId);
if (!$updateStmt->execute()) {
    $updateStmt->close();
    $conn->close();
    sendResponse(false, 'Failed to update appointment');
}
$updateStmt->close();
$conn->close();

sendResponse(true, 'Appointment updated successfully', [
    'appointment_id' => $appointmentId,
    'status' => $newStatus
]);
?>