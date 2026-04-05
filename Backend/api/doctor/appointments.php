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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $statusFilter = isset($_GET['status']) ? validateInput($_GET['status']) : '';
    $allowedStatusFilters = ['pending', 'confirmed', 'cancelled', 'completed'];
    $hasStatusFilter = in_array($statusFilter, $allowedStatusFilters, true);

    $sql = "
        SELECT
            a.id,
            u.id AS patient_id,
            u.full_name AS patient_name,
            u.phone AS patient_phone,
            s.name AS specialty,
            b.name AS branch,
            a.appointment_date,
            a.appointment_time,
            a.status
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN specialists s ON d.specialist_id = s.id
        JOIN branches b ON a.branch_id = b.id
        WHERE a.doctor_id = ?
        " . ($hasStatusFilter ? " AND a.status = ?" : "") . "
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Could not load data. Please try again.');
    }

    if ($hasStatusFilter) {
        $stmt->bind_param('is', $doctorId, $statusFilter);
    } else {
        $stmt->bind_param('i', $doctorId);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $appointments = [];
    while ($row = $result->fetch_assoc()) {
        $appointments[] = [
            'id' => (int)$row['id'],
            'patient_id' => (int)$row['patient_id'],
            'patient_name' => $row['patient_name'],
            'patient_phone' => $row['patient_phone'],
            'specialty' => $row['specialty'],
            'branch' => $row['branch'],
            'appointment_date' => $row['appointment_date'],
            'appointment_time' => $row['appointment_time'],
            'status' => $row['status']
        ];
    }

    $stmt->close();
    $conn->close();
    sendResponse(true, 'Appointments retrieved', $appointments);
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $appointmentId = 0;
    if (isset($input['appointment_id'])) {
        $appointmentId = (int)validateInput($input['appointment_id']);
    } elseif (isset($input['id'])) {
        $appointmentId = (int)validateInput($input['id']);
    }
    $newStatus = isset($input['status']) ? validateInput($input['status']) : '';

    $allowedStatuses = ['confirmed', 'cancelled'];
    if ($appointmentId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
        $conn->close();
        sendResponse(false, 'Invalid appointment update request');
    }

    $checkStmt = $conn->prepare('SELECT id, patient_id, doctor_id, appointment_date, appointment_time, status FROM appointments WHERE id = ? AND doctor_id = ? LIMIT 1');
    if (!$checkStmt) {
        $conn->close();
        sendResponse(false, 'Could not load data. Please try again.');
    }
    $checkStmt->bind_param('ii', $appointmentId, $doctorId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if ($checkResult->num_rows === 0) {
        $checkStmt->close();
        $conn->close();
        sendResponse(false, 'Appointment not found for this doctor');
    }
    $appointment = $checkResult->fetch_assoc();
    $checkStmt->close();

    $currentStatus = (string)($appointment['status'] ?? '');
    $allowedTransitions = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['cancelled']
    ];

    if (!isset($allowedTransitions[$currentStatus]) || !in_array($newStatus, $allowedTransitions[$currentStatus], true)) {
        $conn->close();
        sendResponse(false, 'This appointment status cannot be changed');
    }

    $updateStmt = $conn->prepare('UPDATE appointments SET status = ? WHERE id = ? AND doctor_id = ?');
    if (!$updateStmt) {
        $conn->close();
        sendResponse(false, 'Could not load data. Please try again.');
    }
    $updateStmt->bind_param('sii', $newStatus, $appointmentId, $doctorId);
    $updateStmt->execute();
    $updateStmt->close();

    $responseStmt = $conn->prepare('SELECT id, patient_id, doctor_id, appointment_date, appointment_time, status FROM appointments WHERE id = ? LIMIT 1');
    if (!$responseStmt) {
        $conn->close();
        sendResponse(false, 'Could not load data. Please try again.');
    }
    $responseStmt->bind_param('i', $appointmentId);
    $responseStmt->execute();
    $responseResult = $responseStmt->get_result();
    $updatedAppointment = $responseResult ? $responseResult->fetch_assoc() : null;
    $responseStmt->close();

    $conn->close();
    sendResponse(true, 'Appointment updated', [
        'appointment' => $updatedAppointment ? [
            'id' => (int)$updatedAppointment['id'],
            'patient_id' => (int)$updatedAppointment['patient_id'],
            'doctor_id' => (int)$updatedAppointment['doctor_id'],
            'appointment_date' => $updatedAppointment['appointment_date'],
            'appointment_time' => $updatedAppointment['appointment_time'],
            'status' => $updatedAppointment['status']
        ] : [
            'id' => $appointmentId,
            'status' => $newStatus
        ]
    ]);
}

$conn->close();
sendResponse(false, 'Method not allowed');
?>
