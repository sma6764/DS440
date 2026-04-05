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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

$data = [
    'stats' => [
        'total_doctors' => 0,
        'total_patients' => 0,
        'todays_appointments' => 0,
        'total_branches' => 0
    ],
    'recent_activity' => [],
    'doctors' => [],
    'patients' => [],
    'branches' => [],
    'appointments' => []
];

// Stats
$statsSql = "
    SELECT
        (SELECT COUNT(*) FROM doctors WHERE is_active = 1) AS total_doctors,
        (SELECT COUNT(*) FROM users WHERE role = 'patient') AS total_patients,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE() AND status <> 'cancelled') AS todays_appointments,
        (SELECT COUNT(*) FROM branches) AS total_branches
";
$statsStmt = $conn->prepare($statsSql);
if (!$statsStmt) {
    $conn->close();
    sendResponse(false, 'Failed to load dashboard data');
}
$statsStmt->execute();
$statsResult = $statsStmt->get_result();
if ($statsResult && $statsResult->num_rows > 0) {
    $row = $statsResult->fetch_assoc();
    $data['stats'] = [
        'total_doctors' => (int)$row['total_doctors'],
        'total_patients' => (int)$row['total_patients'],
        'todays_appointments' => (int)$row['todays_appointments'],
        'total_branches' => (int)$row['total_branches']
    ];
}
$statsStmt->close();

// Recent activity (latest 5 appointments)
$activitySql = "
    SELECT
        a.created_at,
        pu.full_name AS patient_name,
        du.full_name AS doctor_name,
        b.name AS branch_name
    FROM appointments a
    JOIN users pu ON a.patient_id = pu.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    JOIN branches b ON a.branch_id = b.id
    ORDER BY a.created_at DESC
    LIMIT 5
";
$activityStmt = $conn->prepare($activitySql);
if (!$activityStmt) {
    $conn->close();
    sendResponse(false, 'Failed to load dashboard data');
}
$activityStmt->execute();
$activityResult = $activityStmt->get_result();
if ($activityResult) {
    while ($row = $activityResult->fetch_assoc()) {
        $data['recent_activity'][] = [
            'time' => $row['created_at'],
            'text' => $row['patient_name'] . ' booked with ' . $row['doctor_name'] . ' at ' . $row['branch_name']
        ];
    }
}
$activityStmt->close();

// Doctors list
$doctorsSql = "
    SELECT
        u.full_name,
        s.name AS specialty,
        b.name AS branch_name,
        d.is_active
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN specialists s ON d.specialist_id = s.id
    JOIN branches b ON d.branch_id = b.id
    ORDER BY u.full_name ASC
";
$doctorsStmt = $conn->prepare($doctorsSql);
if (!$doctorsStmt) {
    $conn->close();
    sendResponse(false, 'Failed to load dashboard data');
}
$doctorsStmt->execute();
$doctorsResult = $doctorsStmt->get_result();
if ($doctorsResult) {
    while ($row = $doctorsResult->fetch_assoc()) {
        $data['doctors'][] = [
            'full_name' => $row['full_name'],
            'specialty' => $row['specialty'],
            'branch' => $row['branch_name'],
            'is_active' => (bool)$row['is_active']
        ];
    }
}
$doctorsStmt->close();

// Patients list
$patientsSql = "
    SELECT full_name, email, phone, created_at
    FROM users
    WHERE role = 'patient'
    ORDER BY created_at DESC
";
$patientsStmt = $conn->prepare($patientsSql);
if (!$patientsStmt) {
    $conn->close();
    sendResponse(false, 'Failed to load dashboard data');
}
$patientsStmt->execute();
$patientsResult = $patientsStmt->get_result();
if ($patientsResult) {
    while ($row = $patientsResult->fetch_assoc()) {
        $data['patients'][] = [
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'registered_at' => $row['created_at']
        ];
    }
}
$patientsStmt->close();

// Branch cards
$branchesSql = "
    SELECT
        b.id,
        b.name,
        b.address,
        b.city,
        COUNT(DISTINCT d.id) AS doctor_count,
        COUNT(a.id) AS appointment_count
    FROM branches b
    LEFT JOIN doctors d ON d.branch_id = b.id AND d.is_active = 1
    LEFT JOIN appointments a ON a.branch_id = b.id
    GROUP BY b.id, b.name, b.address, b.city
    ORDER BY b.name ASC
";
$branchesStmt = $conn->prepare($branchesSql);
if (!$branchesStmt) {
    $conn->close();
    sendResponse(false, 'Failed to load dashboard data');
}
$branchesStmt->execute();
$branchesResult = $branchesStmt->get_result();
if ($branchesResult) {
    while ($row = $branchesResult->fetch_assoc()) {
        $data['branches'][] = [
            'name' => $row['name'],
            'address' => $row['address'],
            'city' => $row['city'],
            'doctor_count' => (int)$row['doctor_count'],
            'appointment_count' => (int)$row['appointment_count']
        ];
    }
}
$branchesStmt->close();

// Appointments table
$appointmentsSql = "
    SELECT
        pu.full_name AS patient_name,
        du.full_name AS doctor_name,
        b.name AS branch_name,
        a.appointment_date,
        a.appointment_time,
        a.status
    FROM appointments a
    JOIN users pu ON a.patient_id = pu.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    JOIN branches b ON a.branch_id = b.id
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
    LIMIT 50
";
$appointmentsStmt = $conn->prepare($appointmentsSql);
if (!$appointmentsStmt) {
    $conn->close();
    sendResponse(false, 'Failed to load dashboard data');
}
$appointmentsStmt->execute();
$appointmentsResult = $appointmentsStmt->get_result();
if ($appointmentsResult) {
    while ($row = $appointmentsResult->fetch_assoc()) {
        $data['appointments'][] = [
            'patient_name' => $row['patient_name'],
            'doctor_name' => $row['doctor_name'],
            'branch' => $row['branch_name'],
            'date' => $row['appointment_date'],
            'time' => $row['appointment_time'],
            'status' => $row['status']
        ];
    }
}
$appointmentsStmt->close();

$conn->close();

sendResponse(true, 'Admin dashboard data retrieved', $data);
?>