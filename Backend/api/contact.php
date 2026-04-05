<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  sendResponse(false, "Method not allowed");
}

// Read incoming JSON body
$data = json_decode(file_get_contents("php://input"), true);

$fullName = validateInput($data['full_name'] ?? '');
$email = validateInput($data['email'] ?? '');
$subject = validateInput($data['subject'] ?? '');
$message = validateInput($data['message'] ?? '');

// Validate all required fields are present and not empty
if ($fullName === '' || $email === '' || $subject === '' || $message === '') {
  sendResponse(false, "All fields are required");
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  sendResponse(false, "Invalid email format");
}

// Validate message length
if (strlen($message) < 10) {
  sendResponse(false, "Message must be at least 10 characters");
}

// Insert into contact_messages table
$sql = "INSERT INTO contact_messages (full_name, email, subject, message, submitted_at) 
        VALUES (?, ?, ?, ?, NOW())";

$stmt = $conn->prepare($sql);

if (!$stmt) {
  sendResponse(false, "Could not send your message. Please try again.");
}

$stmt->bind_param("ssss", $fullName, $email, $subject, $message);

if ($stmt->execute()) {
  sendResponse(true, "Thanks for reaching out! We'll get back to you within 24 hours.");
} else {
  sendResponse(false, "Could not send your message. Please try again.");
}

$stmt->close();
$conn->close();
?>
