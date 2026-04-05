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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "
        SELECT id, full_name, email, phone, insurance_company, created_at
        FROM users
        WHERE role = 'patient'
        ORDER BY created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to fetch patients');
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $patients = [];
    while ($row = $result->fetch_assoc()) {
        $patients[] = [
            'id' => (int)$row['id'],
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'insurance_company' => $row['insurance_company'],
            'created_at' => $row['created_at']
        ];
    }

    $stmt->close();
    $conn->close();
    sendResponse(true, 'Patients fetched successfully', $patients);
}

if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $patientId = 0;
    if (isset($input['patient_id'])) {
        $patientId = (int)validateInput($input['patient_id']);
    } elseif (isset($input['id'])) {
        $patientId = (int)validateInput($input['id']);
    }

    if ($patientId <= 0) {
        $conn->close();
        sendResponse(false, 'Patient id is required');
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND role = 'patient'");
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare delete query');
    }

    $stmt->bind_param('i', $patientId);
    $stmt->execute();
    $deleted = $stmt->affected_rows > 0;
    $stmt->close();
    $conn->close();

    if (!$deleted) {
        sendResponse(false, 'Patient not found or already deleted');
    }

    sendResponse(true, 'Patient deleted successfully');
}

$conn->close();
sendResponse(false, 'Method not allowed');
?>