<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  sendResponse(false, "Method not allowed");
}

// Require admin role
requireRole('admin');

// Get total active doctors count
$doctorsQuery = "SELECT COUNT(*) as count FROM doctors WHERE is_active = 1";
$doctorsResult = $conn->query($doctorsQuery);
$totalDoctors = $doctorsResult->fetch_assoc()['count'];

// Get total patients count (users with role 'patient')
$patientsQuery = "SELECT COUNT(*) as count FROM users WHERE role = 'patient'";
$patientsResult = $conn->query($patientsQuery);
$totalPatients = $patientsResult->fetch_assoc()['count'];

// Get today's appointments count
$todayDate = date('Y-m-d');
$appointmentsQuery = "SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?";
$stmt = $conn->prepare($appointmentsQuery);
$stmt->bind_param("s", $todayDate);
$stmt->execute();
$appointmentsResult = $stmt->get_result();
$todaysAppointments = $appointmentsResult->fetch_assoc()['count'];
$stmt->close();

// Get total branches count
$branchesQuery = "SELECT COUNT(*) as count FROM branches";
$branchesResult = $conn->query($branchesQuery);
$totalBranches = $branchesResult->fetch_assoc()['count'];

$data = [
  'total_doctors' => (int)$totalDoctors,
  'total_patients' => (int)$totalPatients,
  'todays_appointments' => (int)$todaysAppointments,
  'total_branches' => (int)$totalBranches
];

sendResponse(true, "Admin stats retrieved", $data);

$conn->close();
?>
