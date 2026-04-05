<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireLogin();
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    sendResponse(false, "Forbidden. Admin access required.", null, "FORBIDDEN");
    exit();
}

$type = isset($_GET['type']) ? validateInput($_GET['type']) : '';
if ($type === '') {
    sendResponse(false, 'Report type is required');
}

function reportResponse($fileName, $columns, $rows) {
    sendResponse(true, 'Report generated', [
        'fileName' => $fileName,
        'columns' => $columns,
        'rows' => $rows
    ]);
}

if ($type === 'monthly-appointments') {
    $sql = "
        SELECT
            DATE(appointment_date) AS appointment_day,
            COUNT(*) AS total_appointments,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM appointments
        WHERE YEAR(appointment_date) = YEAR(CURDATE())
          AND MONTH(appointment_date) = MONTH(CURDATE())
        GROUP BY DATE(appointment_date)
        ORDER BY appointment_day ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to generate report');
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            $row['appointment_day'],
            (int)$row['total_appointments'],
            (int)$row['completed'],
            (int)$row['confirmed'],
            (int)$row['cancelled'],
            (int)$row['pending']
        ];
    }

    $stmt->close();
    $conn->close();
    reportResponse(
        'monthly_appointments_report.csv',
        ['Date', 'Total Appointments', 'Completed', 'Confirmed', 'Cancelled', 'Pending'],
        $rows
    );
}

if ($type === 'doctor-performance') {
    $sql = "
        SELECT
            u.full_name AS doctor_name,
            s.name AS specialty,
            b.name AS branch,
            COUNT(a.id) AS total_appointments,
            SUM(CASE WHEN a.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
            SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
            ROUND(100 * SUM(CASE WHEN a.status = 'confirmed' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0), 1) AS completion_rate
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        JOIN specialists s ON d.specialist_id = s.id
        JOIN branches b ON d.branch_id = b.id
        LEFT JOIN appointments a ON a.doctor_id = d.id
        GROUP BY d.id, u.full_name, s.name, b.name
        ORDER BY total_appointments DESC, u.full_name ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to generate report');
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            $row['doctor_name'],
            $row['specialty'],
            $row['branch'],
            (int)$row['total_appointments'],
            (int)$row['confirmed_count'],
            (int)$row['cancelled_count'],
            ($row['completion_rate'] === null ? 0 : (float)$row['completion_rate']) . '%'
        ];
    }

    $stmt->close();
    $conn->close();
    reportResponse(
        'doctor_performance_report.csv',
        ['Doctor Name', 'Specialty', 'Branch', 'Total Appointments', 'Confirmed', 'Cancelled', 'Completion Rate %'],
        $rows
    );
}

if ($type === 'revenue') {
    // Estimated revenue using specialist-based base fee * non-cancelled appointments.
    $sql = "
        SELECT
            DATE_FORMAT(a.appointment_date, '%Y-%m') AS month,
            SUM(
                CASE
                    WHEN a.status = 'cancelled' THEN 0
                    ELSE CASE s.name
                        WHEN 'General Practitioner' THEN 80
                        WHEN 'Cardiologist' THEN 150
                        WHEN 'Dermatologist' THEN 120
                        WHEN 'Pediatrician' THEN 75
                        WHEN 'Neurologist' THEN 180
                        WHEN 'Orthopedic' THEN 140
                        ELSE 100
                    END
                END
            ) AS estimated_revenue,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
            SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending_appointments,
            SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_appointments
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN specialists s ON d.specialist_id = s.id
        GROUP BY DATE_FORMAT(a.appointment_date, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to generate report');
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            $row['month'],
            (float)$row['estimated_revenue'],
            (int)$row['completed_appointments'],
            (int)$row['pending_appointments'],
            (int)$row['cancelled_appointments']
        ];
    }

    $stmt->close();
    $conn->close();
    reportResponse(
        'revenue_report.csv',
        ['Month', 'Estimated Revenue (AED)', 'Completed Appointments', 'Pending Appointments', 'Cancelled Appointments'],
        $rows
    );
}

if ($type === 'patient-demographics') {
    $sql = "
        SELECT
            CASE
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) < 18 THEN '0-17'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 18 AND 35 THEN '18-35'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 50 THEN '36-50'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 51 AND 65 THEN '51-65'
                ELSE '66+'
            END AS age_group,
            COUNT(*) AS patient_count
        FROM users
        WHERE role = 'patient' AND date_of_birth IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to generate report');
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            $row['age_group'],
            (int)$row['patient_count']
        ];
    }

    $genderSql = "
        SELECT COALESCE(gender, 'Unknown') AS gender, COUNT(*) AS total
        FROM users
        WHERE role = 'patient'
        GROUP BY COALESCE(gender, 'Unknown')
        ORDER BY total DESC
    ";

    $genderStmt = $conn->prepare($genderSql);
    if (!$genderStmt) {
        $stmt->close();
        $conn->close();
        sendResponse(false, 'Failed to generate report');
    }
    $genderStmt->execute();
    $genderResult = $genderStmt->get_result();
    while ($row = $genderResult->fetch_assoc()) {
        $rows[] = [
            'Gender: ' . $row['gender'],
            (int)$row['total']
        ];
    }

    $genderStmt->close();
    $stmt->close();
    $conn->close();
    reportResponse(
        'patient_demographics_report.csv',
        ['Segment', 'Count'],
        $rows
    );
}

$conn->close();
sendResponse(false, 'Unsupported report type');
?>