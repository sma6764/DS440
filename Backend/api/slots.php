<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

session_start();

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, "Method not allowed");
}

// Get URL parameters
$doctor_id = isset($_GET['doctor_id']) ? (int)validateInput($_GET['doctor_id']) : 0;
$date = isset($_GET['date']) ? validateInput($_GET['date']) : '';

// Validate required parameters
if (!$doctor_id || empty($date)) {
    sendResponse(false, "Doctor ID and date are required");
}

// Validate date format (YYYY-MM-DD)
$dateObj = DateTime::createFromFormat('Y-m-d', $date);
if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
    sendResponse(false, "Invalid date format");
}

// Validate date is not in the past
$today = new DateTime();
$today->setTime(0, 0, 0); // Reset time to start of day
if ($dateObj < $today) {
    sendResponse(false, "Cannot book appointments in the past");
}

// Block Friday, Saturday, and Sunday
$dayOfWeek = (int)date('N', strtotime($date)); // 1=Mon, 7=Sun
if ($dayOfWeek >= 5) { // 5=Fri, 6=Sat, 7=Sun
    sendResponse(false, "No appointments available on weekends or Fridays");
}

// Define all possible time slots
$allSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM"
];

// Query booked slots for this doctor on this date
$stmt = $conn->prepare("
    SELECT appointment_time 
    FROM appointments 
    WHERE doctor_id = ? 
    AND appointment_date = ? 
    AND status IN ('pending', 'confirmed')
");

$stmt->bind_param("is", $doctor_id, $date);
$stmt->execute();
$result = $stmt->get_result();

// Get booked times and convert to 12-hour format for exact comparison
$bookedSlots = [];
while ($row = $result->fetch_assoc()) {
    $time = $row['appointment_time'];
    $bookedSlots[] = trim(date('h:i A', strtotime($time)));
}

$stmt->close();
$conn->close();

// Remove booked slots from available slots using trim + exact string matching
$availableSlots = [];
foreach ($allSlots as $slot) {
    $trimmedSlot = trim($slot);
    if (!in_array($trimmedSlot, $bookedSlots, true)) {
        $availableSlots[] = $trimmedSlot;
    }
}

// Re-index and guarantee uniqueness before returning
$availableSlots = array_values(array_unique($availableSlots));

// Check if all slots are booked
if (empty($availableSlots)) {
    sendResponse(false, "No available slots for this date");
}

// Return available slots
sendResponse(true, "Slots fetched", [
    'doctor_id' => $doctor_id,
    'date' => $date,
    'available_slots' => $availableSlots
]);
?>
