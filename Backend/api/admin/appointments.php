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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

$dateFilter = isset($_GET['date']) ? validateInput($_GET['date']) : '';
$todayOnly = strtolower($dateFilter) === 'today';
$monthFilter = isset($_GET['month']) ? validateInput($_GET['month']) : '';
$statusFilter = isset($_GET['status']) ? strtolower(validateInput($_GET['status'])) : '';
$allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
$hasStatusFilter = in_array($statusFilter, $allowedStatuses, true);
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
if ($hasStatusFilter) {
    $whereClauses[] = 'a.status = ?';
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
        a.doctor_id,
        a.patient_id,
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

if ($hasMonthFilter || $hasStatusFilter) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare appointments query');
    }
    if ($hasMonthFilter && $hasStatusFilter) {
        $stmt->bind_param('sii', $statusFilter, $monthYear, $monthNumber);
    } elseif ($hasMonthFilter) {
        $stmt->bind_param('ii', $monthYear, $monthNumber);
    } else {
        $stmt->bind_param('s', $statusFilter);
    }
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare appointments query');
    }
    $stmt->execute();
    $result = $stmt->get_result();
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
        'doctor_id' => (int)$row['doctor_id'],
        'patient_id' => (int)$row['patient_id'],
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