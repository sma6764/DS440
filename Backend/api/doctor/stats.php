<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireRole('doctor');

$userId = (int)$_SESSION['user_id'];

$doctorStmt = $conn->prepare('SELECT id FROM doctors WHERE user_id = ? LIMIT 1');
if (!$doctorStmt) {
    $conn->close();
    sendResponse(false, 'Could not load data. Please try again.');
}

$doctorStmt->bind_param('i', $userId);
$doctorStmt->execute();
$doctorResult = $doctorStmt->get_result();
if ($doctorResult->num_rows === 0) {
    $doctorStmt->close();
    $conn->close();
    sendResponse(false, 'Doctor profile not found');
}
$doctorId = (int)$doctorResult->fetch_assoc()['id'];
$doctorStmt->close();

$statsSql = "
    SELECT
        SUM(CASE WHEN appointment_date = CURDATE() AND status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) AS today_appointments,
        COUNT(DISTINCT patient_id) AS total_patients,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_confirmations
    FROM appointments
    WHERE doctor_id = ?
";

$stmt = $conn->prepare($statsSql);
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Could not load data. Please try again.');
}
$stmt->bind_param('i', $doctorId);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc() ?: [];
$stmt->close();
$conn->close();

sendResponse(true, 'Doctor stats retrieved', [
    'today_appointments' => (int)($row['today_appointments'] ?? 0),
    'total_patients' => (int)($row['total_patients'] ?? 0),
    'pending_confirmations' => (int)($row['pending_confirmations'] ?? 0)
]);
?>
