<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();
requireLogin();

if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    sendResponse(false, 'Forbidden. Admin access required.');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(false, 'Method not allowed');
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    sendResponse(false, 'Invalid request payload');
}

$name = trim($payload['name'] ?? '');
$address = trim($payload['address'] ?? '');
$city = trim($payload['city'] ?? '');
$phone = trim($payload['phone'] ?? '');

if ($name === '' || $address === '' || $city === '' || $phone === '') {
    sendResponse(false, 'All fields are required');
}

$method = $_SERVER['REQUEST_METHOD'];
$branchId = isset($payload['branch_id']) ? (int)$payload['branch_id'] : 0;

if ($method === 'PUT' && $branchId <= 0) {
    sendResponse(false, 'branch_id is required for update');
}

$checkBranchStmt = $conn->prepare('SELECT id FROM branches WHERE name = ? LIMIT 1');
$checkBranchStmt->bind_param('s', $name);
$checkBranchStmt->execute();
$branchResult = $checkBranchStmt->get_result();
if ($branchResult && $branchResult->num_rows > 0) {
    $existingBranch = $branchResult->fetch_assoc();
    $existingBranchId = (int)$existingBranch['id'];
    $checkBranchStmt->close();
    if ($method === 'POST' || $existingBranchId !== $branchId) {
        $conn->close();
        sendResponse(false, 'Branch name already exists');
    }
} else {
    $checkBranchStmt->close();
}

if ($method === 'POST') {
    $insertStmt = $conn->prepare('INSERT INTO branches (name, address, city, phone) VALUES (?, ?, ?, ?)');
    $insertStmt->bind_param('ssss', $name, $address, $city, $phone);

    if (!$insertStmt->execute()) {
        $insertStmt->close();
        $conn->close();
        sendResponse(false, 'Failed to add branch');
    }

    $insertStmt->close();
    $conn->close();
    sendResponse(true, 'Branch added successfully');
}

$existsStmt = $conn->prepare('SELECT id FROM branches WHERE id = ? LIMIT 1');
$existsStmt->bind_param('i', $branchId);
$existsStmt->execute();
$existsResult = $existsStmt->get_result();
$exists = $existsResult->num_rows > 0;
$existsStmt->close();

if (!$exists) {
    $conn->close();
    sendResponse(false, 'Branch not found');
}

$updateStmt = $conn->prepare('UPDATE branches SET name = ?, address = ?, city = ?, phone = ? WHERE id = ?');
$updateStmt->bind_param('ssssi', $name, $address, $city, $phone, $branchId);

if (!$updateStmt->execute()) {
    $updateStmt->close();
    $conn->close();
    sendResponse(false, 'Failed to update branch');
}

$updateStmt->close();
$conn->close();

sendResponse(true, 'Branch updated successfully');
?>
