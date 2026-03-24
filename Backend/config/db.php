<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'checkmeup');

// Prevent mysqli from throwing uncaught exceptions on connection/query failures.
mysqli_report(MYSQLI_REPORT_OFF);

$conn = @mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if (!$conn) {
    $logFile = dirname(__DIR__) . '/logs/errors.log';
    error_log('DB connection failed: ' . mysqli_connect_error() . PHP_EOL, 3, $logFile);

    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit();
}

if (!mysqli_set_charset($conn, 'utf8mb4')) {
    $logFile = dirname(__DIR__) . '/logs/errors.log';
    error_log('DB charset setup failed: ' . mysqli_error($conn) . PHP_EOL, 3, $logFile);

    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit();
}
