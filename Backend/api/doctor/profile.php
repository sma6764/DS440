<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireRole('doctor');

$userId = (int)$_SESSION['user_id'];

$sql = "
    SELECT
        d.id,
        u.full_name,
        u.email,
        u.phone,
        s.name AS specialty,
        b.name AS branch,
        d.bio,
        d.rating
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN specialists s ON d.specialist_id = s.id
    LEFT JOIN branches b ON d.branch_id = b.id
    WHERE d.user_id = ?
    LIMIT 1
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    $conn->close();
    sendResponse(false, 'Failed to prepare profile query');
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, 'Doctor profile not found');
}

$doctor = $result->fetch_assoc();

$stmt->close();
$conn->close();

sendResponse(true, 'Doctor profile retrieved successfully', [
    'id' => (int)$doctor['id'],
    'full_name' => $doctor['full_name'],
    'email' => $doctor['email'],
    'phone' => $doctor['phone'],
    'specialty' => $doctor['specialty'],
    'branch' => $doctor['branch'],
    'bio' => $doctor['bio'],
    'rating' => $doctor['rating'] !== null ? (float)$doctor['rating'] : null
]);
?>