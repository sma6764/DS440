<?php
require_once '../../config/cors.php';
require_once '../../config/helpers.php';

session_start();

// Destroy the session completely
session_unset();
session_destroy();

// Return success response
sendResponse(true, "Logged out successfully");
?>
