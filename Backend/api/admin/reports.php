<?php
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/helpers.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed');
}

requireRole('admin');

$type = isset($_GET['type']) ? trim($_GET['type']) : '';
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
            DATE_FORMAT(appointment_date, '%Y-%m') AS month,
            COUNT(*) AS total_appointments,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM appointments
        GROUP BY DATE_FORMAT(appointment_date, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
    ";

    $result = $conn->query($sql);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            $row['month'],
            (int)$row['total_appointments'],
            (int)$row['completed'],
            (int)$row['cancelled'],
            (int)$row['pending']
        ];
    }

    $conn->close();
    reportResponse(
        'monthly_appointments_report.csv',
        ['Month', 'Total Appointments', 'Completed', 'Cancelled', 'Pending'],
        $rows
    );
}

if ($type === 'doctor-performance') {
    $sql = "
        SELECT
            u.full_name AS doctor_name,
            s.name AS specialty,
            COUNT(a.id) AS total_appointments,
            ROUND(100 * SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0), 1) AS completion_rate,
            d.rating AS average_rating
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        JOIN specialists s ON d.specialist_id = s.id
        LEFT JOIN appointments a ON a.doctor_id = d.id
        GROUP BY d.id, u.full_name, s.name, d.rating
        ORDER BY total_appointments DESC, u.full_name ASC
    ";

    $result = $conn->query($sql);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            $row['doctor_name'],
            $row['specialty'],
            (int)$row['total_appointments'],
            ($row['completion_rate'] === null ? 0 : (float)$row['completion_rate']) . '%',
            (float)$row['average_rating']
        ];
    }

    $conn->close();
    reportResponse(
        'doctor_performance_report.csv',
        ['Doctor Name', 'Specialty', 'Total Appointments', 'Completion Rate', 'Average Rating'],
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

    $result = $conn->query($sql);
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

    $result = $conn->query($sql);
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

    $genderResult = $conn->query($genderSql);
    while ($row = $genderResult->fetch_assoc()) {
        $rows[] = [
            'Gender: ' . $row['gender'],
            (int)$row['total']
        ];
    }

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