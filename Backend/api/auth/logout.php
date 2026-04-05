<?php
require_once '../../config/cors.php';
require_once '../../config/helpers.php';

session_start();

// Destroy the session completely
session_unset();
session_destroy();

header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Return success response
sendResponse(true, "Logged out successfully");
?>
