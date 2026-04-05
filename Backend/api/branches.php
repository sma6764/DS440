<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, "Method not allowed");
}

// Get optional city filter
$city = isset($_GET['city']) ? validateInput($_GET['city']) : null;
$branchId = isset($_GET['branch_id']) ? (int)validateInput($_GET['branch_id']) : 0;

// Build query
$query = "
    SELECT
        b.id,
        b.name,
        b.address,
        b.city,
        b.phone,
        (
            SELECT COUNT(*)
            FROM doctors d
            WHERE d.branch_id = b.id AND d.is_active = 1
        ) AS doctor_count,
        (
            SELECT COUNT(*)
            FROM appointments a
            WHERE a.branch_id = b.id
        ) AS appointment_count
    FROM branches b
";

if ($city) {
    $query .= " WHERE b.city = ?";
}

if ($branchId > 0) {
    $query .= $city ? " AND b.id = ?" : " WHERE b.id = ?";
}

$query .= " ORDER BY b.name ASC";

// Execute query
if ($city) {
    $stmt = $conn->prepare($query);
    if ($branchId > 0) {
        $stmt->bind_param("si", $city, $branchId);
    } else {
        $stmt->bind_param("s", $city);
    }
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $stmt = $conn->prepare($query);
    if ($branchId > 0) {
        $stmt->bind_param("i", $branchId);
    }
    $stmt->execute();
    $result = $stmt->get_result();
}

$branches = [];
while ($row = $result->fetch_assoc()) {
    $branches[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'address' => $row['address'],
        'city' => $row['city'],
        'phone' => $row['phone'],
        'doctor_count' => (int)$row['doctor_count'],
        'appointment_count' => (int)$row['appointment_count']
    ];
}

if (isset($stmt)) {
    $stmt->close();
}
$conn->close();

sendResponse(true, "Branches fetched", $branches);
?>
