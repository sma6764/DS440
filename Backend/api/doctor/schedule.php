<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'doctor') {
    sendResponse(false, "Forbidden. Doctor access required.", null, "FORBIDDEN");
    exit();
}

$userId = (int)$_SESSION['user_id'];

$doctorStmt = $conn->prepare('SELECT id FROM doctors WHERE user_id = ? LIMIT 1');
if (!$doctorStmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare doctor lookup');
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

// Optional query params: start (preferred) or week_start (legacy), format YYYY-MM-DD.
$weekStartParam = '';
if (isset($_GET['start'])) {
    $weekStartParam = validateInput($_GET['start']);
} elseif (isset($_GET['week_start'])) {
    $weekStartParam = validateInput($_GET['week_start']);
}
$today = new DateTime('today');
if ($weekStartParam !== '') {
    $parsed = DateTime::createFromFormat('Y-m-d', validateInput($weekStartParam));
    if ($parsed instanceof DateTime) {
        $target = new DateTime($parsed->format('Y-m-d'));
        $dayOfWeek = (int)$target->format('N');
        $monday = (clone $target)->modify('-' . ($dayOfWeek - 1) . ' days');
    } else {
        $dayOfWeek = (int)$today->format('N');
        $monday = (clone $today)->modify('-' . ($dayOfWeek - 1) . ' days');
    }
} else {
    $dayOfWeek = (int)$today->format('N');
    $monday = (clone $today)->modify('-' . ($dayOfWeek - 1) . ' days');
}

$friday = (clone $monday)->modify('+4 days');

$startDate = $monday->format('Y-m-d');
$endDate = $friday->format('Y-m-d');

$sql = "
    SELECT
        a.appointment_date,
        a.appointment_time,
        a.status,
        u.full_name AS patient_name,
        u.phone AS patient_phone
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    WHERE a.doctor_id = ?
      AND a.appointment_date BETWEEN ? AND ?
      AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_date, a.appointment_time
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare schedule query');
}

$stmt->bind_param('iss', $doctorId, $startDate, $endDate);
$stmt->execute();
$result = $stmt->get_result();

$groupedByDate = [];
$cursor = clone $monday;
for ($i = 0; $i < 5; $i++) {
    $dateKey = $cursor->format('Y-m-d');
    $groupedByDate[$dateKey] = [
        'day' => $cursor->format('l'),
        'date' => $dateKey,
        'appointments' => []
    ];
    $cursor->modify('+1 day');
}

while ($row = $result->fetch_assoc()) {
    $dateKey = $row['appointment_date'];
    if (!isset($groupedByDate[$dateKey])) {
      continue;
    }

    $groupedByDate[$dateKey]['appointments'][] = [
        'appointment_date' => $row['appointment_date'],
        'appointment_time' => $row['appointment_time'],
        'status' => $row['status'],
        'patient_name' => $row['patient_name'],
        'patient_phone' => $row['patient_phone']
    ];
}

$stmt->close();
$conn->close();

sendResponse(true, 'Schedule retrieved successfully', [
    'week_start' => $startDate,
    'week_end' => $endDate,
    'days' => array_values($groupedByDate)
]);
?>