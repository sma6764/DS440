<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

// Require user to be logged in
requireLogin();

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, "Method not allowed");
}

// Check for admin override
$targetUserId = $_SESSION['user_id'];
if ($_SESSION['user_role'] === 'admin' && isset($_GET['patient_id'])) {
    // Admin is trying to fetch another patient's profile
    $targetUserId = intval($_GET['patient_id']);
    
    // If the provided patient_id is invalid or zero, use the admin's own ID
    if ($targetUserId <= 0) {
        $targetUserId = $_SESSION['user_id'];
    }
}

// Query the users table for the target user
$stmt = $conn->prepare("SELECT id, full_name, email, phone, date_of_birth, gender, insurance_company, created_at FROM users WHERE id = ?");
$stmt->bind_param("i", $targetUserId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, "User not found");
}

$user = $result->fetch_assoc();
$stmt->close();
$conn->close();

$normalizedInsurance = normalizeInsuranceCompany($user['insurance_company']);

// Return profile data (without password_hash)
sendResponse(true, "Profile fetched", [
    'id' => $user['id'],
    'full_name' => $user['full_name'],
    'email' => $user['email'],
    'phone' => $user['phone'],
    'date_of_birth' => $user['date_of_birth'],
    'gender' => $user['gender'],
    'insurance_company' => $normalizedInsurance,
    'created_at' => $user['created_at']
]);
?>
