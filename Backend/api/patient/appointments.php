<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

// Require user to be logged in
requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET requests - Fetch appointments
if ($method === 'GET') {
    // Get type parameter (upcoming, past, or all)
    $type = isset($_GET['type']) ? validateInput($_GET['type']) : 'upcoming';
    
    // Check for admin override
    $targetPatientId = $_SESSION['user_id'];
    if ($_SESSION['user_role'] === 'admin' && isset($_GET['patient_id'])) {
        // Admin is trying to fetch another patient's appointments
        $targetPatientId = (int)validateInput($_GET['patient_id']);
        
        // If the provided patient_id is invalid or zero, use the session user's ID
        if ($targetPatientId <= 0) {
            $targetPatientId = $_SESSION['user_id'];
        }
    }
    
    // Build query based on type
    if ($type === 'past') {
        // Past appointments: completed only
        $query = "
            SELECT 
                a.id,
                u.full_name as doctor_name,
                s.name as specialty,
                b.name as branch,
                a.appointment_date as date,
                a.appointment_time as time,
                a.status
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            JOIN specialists s ON d.specialist_id = s.id
            JOIN branches b ON a.branch_id = b.id
            WHERE a.patient_id = ?
            AND a.status = 'completed'
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        ";
    } else if ($type === 'all') {
        // All appointments: regardless of status or date
        $query = "
            SELECT 
                a.id,
                u.full_name as doctor_name,
                s.name as specialty,
                b.name as branch,
                a.appointment_date as date,
                a.appointment_time as time,
                a.status
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            JOIN specialists s ON d.specialist_id = s.id
            JOIN branches b ON a.branch_id = b.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        ";
    } else {
        // Upcoming appointments: pending or confirmed and future dates only
        $query = "
            SELECT 
                a.id,
                u.full_name as doctor_name,
                s.name as specialty,
                b.name as branch,
                a.appointment_date as date,
                a.appointment_time as time,
                a.status
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            JOIN specialists s ON d.specialist_id = s.id
            JOIN branches b ON a.branch_id = b.id
            WHERE a.patient_id = ?
            AND a.status IN ('pending', 'confirmed')
            AND a.appointment_date >= CURDATE()
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        ";
    }
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $targetPatientId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $appointments = [];
    while ($row = $result->fetch_assoc()) {
        // Format time to 12-hour format
        $time = date('g:i A', strtotime($row['time']));
        
        $appointments[] = [
            'id' => $row['id'],
            'doctor_name' => $row['doctor_name'],
            'specialty' => $row['specialty'],
            'branch' => $row['branch'],
            'date' => $row['date'],
            'time' => $time,
            'status' => $row['status']
        ];
    }
    
    $stmt->close();
    $conn->close();
    
    sendResponse(true, "Appointments fetched", $appointments);
}

// Handle DELETE requests - Cancel appointment
else if ($method === 'DELETE') {
    // Read JSON input
    $data = json_decode(file_get_contents("php://input"), true);
    $appointmentId = isset($data['id']) ? (int)validateInput($data['id']) : 0;
    
    if ($appointmentId <= 0) {
        sendResponse(false, "Invalid appointment ID");
    }
    
    // Verify appointment belongs to logged-in patient
    $stmt = $conn->prepare("SELECT id FROM appointments WHERE id = ? AND patient_id = ?");
    $stmt->bind_param("ii", $appointmentId, $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        sendResponse(false, "Appointment not found or access denied");
    }
    $stmt->close();
    
    // Update appointment status to cancelled
    $stmt = $conn->prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ? AND patient_id = ?");
    $stmt->bind_param("ii", $appointmentId, $_SESSION['user_id']);
    
    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        sendResponse(true, "Appointment cancelled successfully");
    } else {
        $stmt->close();
        $conn->close();
        sendResponse(false, "Failed to cancel appointment");
    }
}

// Method not allowed
else {
    sendResponse(false, "Method not allowed");
}
?>
