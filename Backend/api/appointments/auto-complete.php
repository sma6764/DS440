<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

$today = date('Y-m-d');

$updateStmt = $conn->prepare("UPDATE appointments SET status = 'completed' WHERE status = 'confirmed' AND appointment_date < ?");
if (!$updateStmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare auto-complete update');
}

$updateStmt->bind_param('s', $today);
$updateStmt->execute();
$updatedRows = $updateStmt->affected_rows;
$updateStmt->close();
$conn->close();

sendResponse(true, 'Appointments auto-completed', [
    'updated_count' => $updatedRows
]);
?>