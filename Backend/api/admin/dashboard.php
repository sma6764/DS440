<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireRole('admin');

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
$statsResult = $conn->query($statsSql);
if ($statsResult && $statsResult->num_rows > 0) {
    $row = $statsResult->fetch_assoc();
    $data['stats'] = [
        'total_doctors' => (int)$row['total_doctors'],
        'total_patients' => (int)$row['total_patients'],
        'todays_appointments' => (int)$row['todays_appointments'],
        'total_branches' => (int)$row['total_branches']
    ];
}

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
$activityResult = $conn->query($activitySql);
if ($activityResult) {
    while ($row = $activityResult->fetch_assoc()) {
        $data['recent_activity'][] = [
            'time' => $row['created_at'],
            'text' => $row['patient_name'] . ' booked with ' . $row['doctor_name'] . ' at ' . $row['branch_name']
        ];
    }
}

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
$doctorsResult = $conn->query($doctorsSql);
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

// Patients list
$patientsSql = "
    SELECT full_name, email, phone, created_at
    FROM users
    WHERE role = 'patient'
    ORDER BY created_at DESC
";
$patientsResult = $conn->query($patientsSql);
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
$branchesResult = $conn->query($branchesSql);
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
$appointmentsResult = $conn->query($appointmentsSql);
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

$conn->close();

sendResponse(true, 'Admin dashboard data retrieved', $data);
?>