<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

session_start();

requireLogin();

$currentRole = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

$method = $_SERVER['REQUEST_METHOD'];

// Handle POST - Create new booking
if ($method === 'POST') {
    if ($currentRole !== 'patient') {
        sendResponse(false, "Forbidden. Patient access required.", null, "FORBIDDEN");
    }
    
    // Read JSON input
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Extract fields
    $doctor_id = isset($data['doctor_id']) ? (int)validateInput($data['doctor_id']) : 0;
    $branch_id = isset($data['branch_id']) ? (int)validateInput($data['branch_id']) : 0;
    $appointment_date = isset($data['appointment_date']) ? validateInput($data['appointment_date']) : '';
    $appointment_time = isset($data['appointment_time']) ? validateInput($data['appointment_time']) : '';

    // If branch_id is missing, derive it from selected doctor.
    if (!$branch_id && $doctor_id) {
        $branchStmt = $conn->prepare("SELECT branch_id FROM doctors WHERE id = ? LIMIT 1");
        $branchStmt->bind_param("i", $doctor_id);
        $branchStmt->execute();
        $branchResult = $branchStmt->get_result();
        if ($branchRow = $branchResult->fetch_assoc()) {
            $branch_id = intval($branchRow['branch_id']);
        }
        $branchStmt->close();
    }
    
    // Validate required fields
    if (!$doctor_id || !$branch_id || empty($appointment_date) || empty($appointment_time)) {
        sendResponse(false, "All booking fields are required");
    }
    
    // Validate date is not in the past
    $dateObj = DateTime::createFromFormat('Y-m-d', $appointment_date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $appointment_date) {
        sendResponse(false, "Invalid appointment date format");
    }
    $today = new DateTime();
    $today->setTime(0, 0, 0);
    
    if ($dateObj < $today) {
        sendResponse(false, "Cannot book appointments in the past");
    }
    
    // Convert time from 12-hour format to 24-hour format for database storage
    $time24 = date('H:i:s', strtotime($appointment_time));
    if ($time24 === '00:00:00' && stripos($appointment_time, '12:00 AM') === false && $appointment_time !== '00:00' && $appointment_time !== '00:00:00') {
        sendResponse(false, "Invalid appointment time format");
    }
    
    // Check if slot is still available
    $stmt = $conn->prepare("
        SELECT id FROM appointments 
        WHERE doctor_id = ? 
        AND appointment_date = ? 
        AND appointment_time = ? 
        AND status IN ('pending', 'confirmed')
    ");
    
    $stmt->bind_param("iss", $doctor_id, $appointment_date, $time24);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $stmt->close();
        $conn->close();
        sendResponse(false, "This slot was just booked by someone else");
    }
    $stmt->close();
    
    // Insert new appointment
    $patient_id = $_SESSION['user_id'];
    $status = 'pending';
    
    $stmt = $conn->prepare("
        INSERT INTO appointments (patient_id, doctor_id, branch_id, appointment_date, appointment_time, status) 
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->bind_param("iiisss", $patient_id, $doctor_id, $branch_id, $appointment_date, $time24, $status);
    
    if ($stmt->execute()) {
        $appointment_id = $stmt->insert_id;
        $stmt->close();
        $conn->close();
        
        sendResponse(true, "Appointment booked successfully!", [
            'appointment_id' => $appointment_id,
            'status' => $status
        ]);
    } else {
        $stmt->close();
        $conn->close();
        sendResponse(false, "Failed to book appointment. Please try again.");
    }
}

// Handle GET - Get single booking details
else if ($method === 'GET') {
    // Get appointment_id parameter
    $appointment_id = isset($_GET['appointment_id']) ? (int)validateInput($_GET['appointment_id']) : 0;
    
    if (!$appointment_id) {
        sendResponse(false, "Appointment ID is required");
    }
    
    // Query appointment details with JOINs
    $stmt = $conn->prepare("
        SELECT 
            a.id,
            a.appointment_date,
            a.appointment_time,
            a.status,
            u.full_name as doctor_name,
            s.name as specialty,
            b.name as branch,
            b.address,
            b.city,
            b.phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        JOIN specialists s ON d.specialist_id = s.id
        JOIN branches b ON a.branch_id = b.id
        WHERE a.id = ? AND a.patient_id = ?
    ");
    
    $stmt->bind_param("ii", $appointment_id, $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        sendResponse(false, "Appointment not found or access denied");
    }
    
    $appointment = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    
    // Format time to 12-hour format
    $time12 = date('g:i A', strtotime($appointment['appointment_time']));
    
    sendResponse(true, "Appointment details fetched", [
        'id' => $appointment['id'],
        'date' => $appointment['appointment_date'],
        'time' => $time12,
        'status' => $appointment['status'],
        'doctor_name' => $appointment['doctor_name'],
        'specialty' => $appointment['specialty'],
        'branch' => $appointment['branch'],
        'address' => $appointment['address'],
        'city' => $appointment['city'],
        'phone' => $appointment['phone']
    ]);
}

// Method not allowed
else {
    sendResponse(false, "Method not allowed");
}
?>
