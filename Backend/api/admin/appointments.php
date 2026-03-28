<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireRole('admin');

$dateFilter = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
$todayOnly = strtolower($dateFilter) === 'today';
$monthFilter = isset($_GET['month']) ? trim((string)$_GET['month']) : '';
$monthYear = 0;
$monthNumber = 0;
$hasMonthFilter = false;

if ($monthFilter !== '' && preg_match('/^(\d{4})-(\d{2})$/', $monthFilter, $matches)) {
    $parsedYear = (int)$matches[1];
    $parsedMonth = (int)$matches[2];
    if ($parsedMonth >= 1 && $parsedMonth <= 12) {
        $hasMonthFilter = true;
        $monthYear = $parsedYear;
        $monthNumber = $parsedMonth;
    }
}

$whereClauses = [];
if ($todayOnly) {
    $whereClauses[] = 'a.appointment_date = CURDATE()';
}
if ($hasMonthFilter) {
    $whereClauses[] = 'YEAR(a.appointment_date) = ? AND MONTH(a.appointment_date) = ?';
}

$whereSql = '';
if (!empty($whereClauses)) {
    $whereSql = ' WHERE ' . implode(' AND ', $whereClauses);
}

$sql = "
    SELECT
        a.id,
        u.full_name AS patient_name,
        doc.full_name AS doctor_name,
        s.name AS specialty,
        b.name AS branch,
        a.appointment_date,
        a.appointment_time,
        a.status
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users doc ON d.user_id = doc.id
    JOIN specialists s ON d.specialist_id = s.id
    JOIN branches b ON a.branch_id = b.id
    $whereSql
    ORDER BY a.appointment_date DESC
";

if ($hasMonthFilter) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare appointments query');
    }
    $stmt->bind_param('ii', $monthYear, $monthNumber);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query($sql);
}

if (!$result) {
    if (isset($stmt)) {
        $stmt->close();
    }
    $conn->close();
    sendResponse(false, 'Failed to fetch appointments');
}

$appointments = [];
while ($row = $result->fetch_assoc()) {
    $appointments[] = [
        'id' => (int)$row['id'],
        'patient_name' => $row['patient_name'],
        'doctor_name' => $row['doctor_name'],
        'specialty' => $row['specialty'],
        'branch' => $row['branch'],
        'appointment_date' => $row['appointment_date'],
        'appointment_time' => $row['appointment_time'],
        'status' => $row['status']
    ];
}

if (isset($stmt)) {
    $stmt->close();
}

$conn->close();
sendResponse(true, 'Appointments fetched successfully', $appointments);
?>