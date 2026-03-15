<?php
require_once '../../config/cors.php';
require_once '../../config/helpers.php';

session_start();

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  sendResponse(false, "Method not allowed");
}

// Check if session is active
if (isset($_SESSION['user_id'])) {
  $data = [
    'user_id' => $_SESSION['user_id'],
    'user_email' => $_SESSION['user_email'],
    'user_name' => $_SESSION['user_name'],
    'user_role' => $_SESSION['user_role'],
    'user_insurance' => isset($_SESSION['user_insurance']) ? $_SESSION['user_insurance'] : null
  ];
  
  sendResponse(true, "Session active", $data);
} else {
  http_response_code(200);
  echo json_encode([
    'success' => false,
    'message' => 'No active session',
    'data' => null
  ]);
  exit();
}
?>
