<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, "Method not allowed");
}

// Get URL parameters
$specialist = isset($_GET['specialist']) ? validateInput($_GET['specialist']) : null;
$branch_id = isset($_GET['branch_id']) ? (int)validateInput($_GET['branch_id']) : null;
$doctor_id = isset($_GET['doctor_id']) ? (int)validateInput($_GET['doctor_id']) : null;

// If doctor_id is provided, return full details of that one doctor
if ($doctor_id) {
    $query = "
        SELECT 
            d.id,
            u.full_name,
            s.name as specialty,
            b.name as branch,
            d.branch_id,
            d.bio,
            d.is_active
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        JOIN specialists s ON d.specialist_id = s.id
        JOIN branches b ON d.branch_id = b.id
        WHERE d.id = ? AND d.is_active = 1
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $doctor_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        sendResponse(false, "Doctor not found");
    }
    
    $doctor = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    
    sendResponse(true, "Doctor details fetched", [
        'id' => $doctor['id'],
        'full_name' => $doctor['full_name'],
        'specialty' => $doctor['specialty'],
        'branch' => $doctor['branch'],
        'branch_id' => $doctor['branch_id'],
        'bio' => $doctor['bio'],
        'is_active' => (bool)$doctor['is_active']
    ]);
}

// Otherwise, return filtered array of doctors
$query = "
    SELECT 
        d.id,
        u.full_name,
        s.name as specialty,
        b.name as branch,
        d.branch_id,
        d.bio,
        d.is_active
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN specialists s ON d.specialist_id = s.id
    JOIN branches b ON d.branch_id = b.id
    WHERE d.is_active = 1
";

$params = [];
$types = "";

// Add specialist filter if provided
if ($specialist) {
    $query .= " AND s.name = ?";
    $params[] = $specialist;
    $types .= "s";
}

// Add branch filter if provided
if ($branch_id) {
    $query .= " AND d.branch_id = ?";
    $params[] = $branch_id;
    $types .= "i";
}

// Order alphabetically by doctor name
$query .= " ORDER BY u.full_name ASC";

// Prepare and execute query
if (count($params) > 0) {
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, "Failed to fetch doctors");
    }

    $stmt->execute();
    $result = $stmt->get_result();
}

$doctors = [];
while ($row = $result->fetch_assoc()) {
    $doctors[] = [
        'id' => $row['id'],
        'full_name' => $row['full_name'],
        'specialty' => $row['specialty'],
        'branch' => $row['branch'],
        'branch_id' => $row['branch_id'],
        'bio' => $row['bio'],
        'is_active' => (bool)$row['is_active']
    ];
}

if (isset($stmt)) {
    $stmt->close();
}
$conn->close();

sendResponse(true, "Doctors fetched", $doctors);
?>
