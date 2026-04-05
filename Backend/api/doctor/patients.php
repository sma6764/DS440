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

$sql = "
    SELECT DISTINCT
        u.id,
        u.full_name,
        u.email,
        u.date_of_birth,
        u.gender,
        u.phone,
        u.insurance_company,
        MAX(a.appointment_date) AS last_visit,
        COUNT(a.id) AS total_appointments
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    WHERE a.doctor_id = ?
    GROUP BY u.id, u.full_name, u.email, u.date_of_birth, u.gender, u.phone, u.insurance_company
    ORDER BY last_visit DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare patients query');
}

$stmt->bind_param('i', $doctorId);
$stmt->execute();
$result = $stmt->get_result();

$patients = [];
while ($row = $result->fetch_assoc()) {
    $patients[] = [
        'id' => (int)$row['id'],
        'full_name' => $row['full_name'],
        'email' => $row['email'],
        'date_of_birth' => $row['date_of_birth'],
        'gender' => $row['gender'],
        'phone' => $row['phone'],
        'insurance_company' => $row['insurance_company'],
        'last_visit' => $row['last_visit'],
        'total_appointments' => (int)$row['total_appointments']
    ];
}

$stmt->close();
$conn->close();

sendResponse(true, 'Patients retrieved successfully', $patients);
?>