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
requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
  sendResponse(false, "Forbidden. Admin access required.", null, "FORBIDDEN");
  exit();
}

// Get total active doctors count
$doctorsQuery = "SELECT COUNT(*) as count FROM doctors WHERE is_active = 1";
$doctorsStmt = $conn->prepare($doctorsQuery);
if (!$doctorsStmt) {
  $conn->close();
  sendResponse(false, "Failed to retrieve admin stats");
}
$doctorsStmt->execute();
$doctorsResult = $doctorsStmt->get_result();
$totalDoctors = $doctorsResult->fetch_assoc()['count'];
$doctorsStmt->close();

// Get total patients count (users with role 'patient')
$patientsQuery = "SELECT COUNT(*) as count FROM users WHERE role = 'patient'";
$patientsStmt = $conn->prepare($patientsQuery);
if (!$patientsStmt) {
  $conn->close();
  sendResponse(false, "Failed to retrieve admin stats");
}
$patientsStmt->execute();
$patientsResult = $patientsStmt->get_result();
$totalPatients = $patientsResult->fetch_assoc()['count'];
$patientsStmt->close();

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
$branchesStmt = $conn->prepare($branchesQuery);
if (!$branchesStmt) {
  $conn->close();
  sendResponse(false, "Failed to retrieve admin stats");
}
$branchesStmt->execute();
$branchesResult = $branchesStmt->get_result();
$totalBranches = $branchesResult->fetch_assoc()['count'];
$branchesStmt->close();

$data = [
  'total_doctors' => (int)$totalDoctors,
  'total_patients' => (int)$totalPatients,
  'todays_appointments' => (int)$todaysAppointments,
  'total_branches' => (int)$totalBranches
];

sendResponse(true, "Admin stats retrieved", $data);

$conn->close();
?>
