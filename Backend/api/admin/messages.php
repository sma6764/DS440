<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    sendResponse(false, "Forbidden. Admin access required.", null, "FORBIDDEN");
    exit();
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit();
}

$stmt = $conn->prepare("SELECT id, full_name, email, subject, message, submitted_at
        FROM contact_messages
        ORDER BY submitted_at DESC, id DESC");

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Could not load messages'
    ]);
    exit();
}

$stmt->execute();
$result = $stmt->get_result();

if ($result === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Could not load messages'
    ]);
    exit();
}

$messages = [];
while ($row = mysqli_fetch_assoc($result)) {
    $messages[] = $row;
}

$stmt->close();

echo json_encode([
    'success' => true,
    'data' => $messages
]);
