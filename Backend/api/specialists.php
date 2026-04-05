<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

$stmt = $conn->prepare('SELECT id, name FROM specialists ORDER BY name ASC');
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Failed to fetch specialists');
}

$stmt->execute();
$result = $stmt->get_result();

$specialists = [];
while ($row = $result->fetch_assoc()) {
    $specialists[] = [
        'id' => (int)$row['id'],
        'name' => $row['name']
    ];
}

$conn->close();

sendResponse(true, 'Specialists fetched', $specialists);
?>