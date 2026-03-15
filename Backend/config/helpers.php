<?php
// Check-me-up Helper Functions — DS440 Group 12

/**
 * Send standardized JSON response
 * 
 * @param bool $success - Whether the operation was successful
 * @param string $message - Response message
 * @param mixed $data - Optional data to include in response
 * @return void
 */
function sendResponse($success, $message, $data = null) {
    http_response_code($success ? 200 : 400);
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit();
}

/**
 * Sanitize user input
 * 
 * @param mysqli $conn - Database connection
 * @param string $input - Input to sanitize
 * @return string - Sanitized input
 */
function sanitize($conn, $input) {
    return mysqli_real_escape_string($conn, trim($input));
}

/**
 * Check if user is logged in
 * 
 * @return bool - True if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Require user to be logged in or exit with error
 * 
 * @return void
 */
function requireLogin() {
    if (!isLoggedIn()) {
        sendResponse(false, "Unauthorized. Please log in.");
        exit();
    }
}

/**
 * Require specific role or exit with error
 * 
 * @param string $role - Required role (admin, doctor, patient)
 * @return void
 */
function requireRole($role) {
    requireLogin();
    
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== $role) {
        sendResponse(false, "Forbidden. You do not have permission to access this resource.");
    }
}
?>
