<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'doctor') {
    sendResponse(false, "Forbidden. Doctor access required.", null, "FORBIDDEN");
    exit();
}

$userId = (int)$_SESSION['user_id'];

$doctorSql = "
    SELECT
        d.id AS doctor_id,
        u.full_name,
        s.name AS specialty
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN specialists s ON d.specialist_id = s.id
    WHERE d.user_id = ?
    LIMIT 1
";
$stmt = $conn->prepare($doctorSql);
$stmt->bind_param('i', $userId);
$stmt->execute();
$doctorResult = $stmt->get_result();

if ($doctorResult->num_rows === 0) {
    $stmt->close();
    $conn->close();
    sendResponse(false, 'Doctor profile not found');
}

$doctorRow = $doctorResult->fetch_assoc();
$doctorId = (int)$doctorRow['doctor_id'];
$stmt->close();

// Stats
$statsSql = "
    SELECT
        SUM(CASE WHEN appointment_date = CURDATE() AND status <> 'cancelled' THEN 1 ELSE 0 END) AS todays_appointments,
        COUNT(DISTINCT patient_id) AS total_patients,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_confirmations
    FROM appointments
    WHERE doctor_id = ?
";
$stmt = $conn->prepare($statsSql);
$stmt->bind_param('i', $doctorId);
$stmt->execute();
$statsResult = $stmt->get_result();
$statsRow = $statsResult->fetch_assoc();
$stmt->close();

// Appointments
$appointments = [];
$appointmentsSql = "
    SELECT
        pu.full_name AS patient_name,
        a.appointment_date,
        a.appointment_time,
        s.name AS specialty,
        a.status
    FROM appointments a
    JOIN users pu ON a.patient_id = pu.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN specialists s ON d.specialist_id = s.id
    WHERE a.doctor_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
    LIMIT 50
";
$stmt = $conn->prepare($appointmentsSql);
$stmt->bind_param('i', $doctorId);
$stmt->execute();
$appointmentsResult = $stmt->get_result();
while ($row = $appointmentsResult->fetch_assoc()) {
    $appointments[] = [
        'patient_name' => $row['patient_name'],
        'date' => $row['appointment_date'],
        'time' => $row['appointment_time'],
        'specialty' => $row['specialty'],
        'status' => $row['status']
    ];
}
$stmt->close();

// Patients
$patients = [];
$patientsSql = "
    SELECT
        u.full_name,
        u.date_of_birth,
        MAX(a.appointment_date) AS last_visit
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    WHERE a.doctor_id = ?
    GROUP BY u.id, u.full_name, u.date_of_birth
    ORDER BY last_visit DESC
";
$stmt = $conn->prepare($patientsSql);
$stmt->bind_param('i', $doctorId);
$stmt->execute();
$patientsResult = $stmt->get_result();
while ($row = $patientsResult->fetch_assoc()) {
    $age = null;
    if (!empty($row['date_of_birth'])) {
        $dob = new DateTime($row['date_of_birth']);
        $now = new DateTime();
        $age = $now->diff($dob)->y;
    }

    $patients[] = [
        'full_name' => $row['full_name'],
        'age' => $age,
        'last_visit' => $row['last_visit']
    ];
}
$stmt->close();

$conn->close();

sendResponse(true, 'Doctor dashboard data retrieved', [
    'profile' => [
        'full_name' => $doctorRow['full_name'],
        'specialty' => $doctorRow['specialty']
    ],
    'stats' => [
        'todays_appointments' => (int)$statsRow['todays_appointments'],
        'total_patients' => (int)$statsRow['total_patients'],
        'pending_confirmations' => (int)$statsRow['pending_confirmations']
    ],
    'appointments' => $appointments,
    'patients' => $patients
]);
?>