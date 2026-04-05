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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $doctorIdParam = isset($_GET['doctor_id']) ? (int)validateInput($_GET['doctor_id']) : 0;

    if ($doctorIdParam > 0) {
        $sql = "
            SELECT
                d.id,
                d.specialist_id,
                d.branch_id,
                d.bio,
                d.is_active,
                u.full_name,
                u.email,
                u.phone,
                u.date_of_birth,
                u.gender
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
            LIMIT 1
        ";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            $conn->close();
            sendResponse(false, 'Failed to prepare doctor details query');
        }

        $stmt->bind_param('i', $doctorIdParam);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result || $result->num_rows === 0) {
            $stmt->close();
            $conn->close();
            sendResponse(false, 'Doctor not found');
        }

        $row = $result->fetch_assoc();
        $stmt->close();
        $conn->close();

        sendResponse(true, 'Doctor fetched successfully', [
            'id' => (int)$row['id'],
            'specialist_id' => (int)$row['specialist_id'],
            'branch_id' => (int)$row['branch_id'],
            'bio' => $row['bio'],
            'is_active' => (int)$row['is_active'] === 1,
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'date_of_birth' => $row['date_of_birth'],
            'gender' => $row['gender']
        ]);
    }

    $sql = "
        SELECT
            d.id,
            u.full_name,
            u.email,
            u.phone,
            s.name AS specialty,
            b.name AS branch,
            d.is_active
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        JOIN specialists s ON d.specialist_id = s.id
        JOIN branches b ON d.branch_id = b.id
        ORDER BY u.full_name ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        sendResponse(false, 'Failed to fetch doctors');
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $doctors = [];
    while ($row = $result->fetch_assoc()) {
        $doctors[] = [
            'id' => (int)$row['id'],
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'specialty' => $row['specialty'],
            'branch' => $row['branch'],
            'is_active' => (int)$row['is_active'] === 1
        ];
    }

    $conn->close();
    sendResponse(true, 'Doctors fetched successfully', $doctors);
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $doctorId = 0;
    if (isset($input['doctor_id'])) {
        $doctorId = (int)$input['doctor_id'];
    } elseif (isset($input['id'])) {
        $doctorId = (int)$input['id'];
    }

    $isActive = isset($input['is_active']) ? (int)validateInput($input['is_active']) : null;

    if ($doctorId <= 0) {
        $conn->close();
        sendResponse(false, 'Doctor id is required');
    }

    $existsStmt = $conn->prepare('SELECT id FROM doctors WHERE id = ? LIMIT 1');
    if (!$existsStmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare doctor lookup');
    }
    $existsStmt->bind_param('i', $doctorId);
    $existsStmt->execute();
    $existsResult = $existsStmt->get_result();
    $exists = $existsResult->num_rows > 0;
    $existsStmt->close();

    if (!$exists) {
        $conn->close();
        sendResponse(false, 'Doctor not found');
    }

    $isStatusToggleOnly =
        $isActive !== null &&
        !isset($input['full_name']) &&
        !isset($input['email']) &&
        !isset($input['phone']) &&
        !isset($input['date_of_birth']) &&
        !isset($input['gender']) &&
        !isset($input['specialist_id']) &&
        !isset($input['branch_id']) &&
        !isset($input['bio']) &&
        !isset($input['password']) &&
        !isset($input['confirm_password']);

    if ($isStatusToggleOnly) {
        $normalizedIsActive = $isActive === 1 ? 1 : 0;

        $stmt = $conn->prepare('UPDATE doctors SET is_active = ? WHERE id = ?');
        if (!$stmt) {
            $conn->close();
            sendResponse(false, 'Failed to prepare update query');
        }

        $stmt->bind_param('ii', $normalizedIsActive, $doctorId);
        $stmt->execute();
        $updated = $stmt->affected_rows >= 0;
        $stmt->close();
        $conn->close();

        if (!$updated) {
            sendResponse(false, 'Failed to update doctor status');
        }

        sendResponse(true, 'Doctor status updated', [
            'doctor_id' => $doctorId,
            'is_active' => $normalizedIsActive
        ]);
    }

    $fullName = validateInput($input['full_name'] ?? '');
    $email = validateInput($input['email'] ?? '');
    $phone = validateInput($input['phone'] ?? '');
    $dateOfBirth = validateInput($input['date_of_birth'] ?? '');
    $gender = validateInput($input['gender'] ?? '');
    $specialistId = (int)validateInput($input['specialist_id'] ?? 0);
    $branchId = (int)validateInput($input['branch_id'] ?? 0);
    $bio = validateInput($input['bio'] ?? '');
    $password = validateInput($input['password'] ?? '');
    $confirmPassword = validateInput($input['confirm_password'] ?? '');

    if (
        $fullName === '' || $email === '' || $phone === '' || $dateOfBirth === '' ||
        $gender === '' || $specialistId <= 0 || $branchId <= 0 || $bio === ''
    ) {
        $conn->close();
        sendResponse(false, 'All required fields must be provided for update');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $conn->close();
        sendResponse(false, 'Invalid email format');
    }

    if (!preg_match('/^[0-9+\s\-()+]{7,20}$/', $phone)) {
        $conn->close();
        sendResponse(false, 'Phone number can only contain numbers, spaces, +, parentheses, and dashes');
    }

    $allowedGenders = ['Male', 'Female', 'Prefer not to say'];
    if (!in_array($gender, $allowedGenders, true)) {
        $conn->close();
        sendResponse(false, 'Invalid gender value');
    }

    if (($password !== '' || $confirmPassword !== '') && $password !== $confirmPassword) {
        $conn->close();
        sendResponse(false, 'Passwords do not match');
    }

    $userLookupStmt = $conn->prepare('SELECT user_id FROM doctors WHERE id = ? LIMIT 1');
    if (!$userLookupStmt) {
        $conn->close();
        sendResponse(false, 'Failed to prepare doctor user lookup');
    }
    $userLookupStmt->bind_param('i', $doctorId);
    $userLookupStmt->execute();
    $userLookupResult = $userLookupStmt->get_result();
    if (!$userLookupResult || $userLookupResult->num_rows === 0) {
        $userLookupStmt->close();
        $conn->close();
        sendResponse(false, 'Doctor not found');
    }
    $userId = (int)$userLookupResult->fetch_assoc()['user_id'];
    $userLookupStmt->close();

    $emailCheckStmt = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
    if (!$emailCheckStmt) {
        $conn->close();
        sendResponse(false, 'Failed to validate email');
    }
    $emailCheckStmt->bind_param('si', $email, $userId);
    $emailCheckStmt->execute();
    $emailExists = $emailCheckStmt->get_result()->num_rows > 0;
    $emailCheckStmt->close();
    if ($emailExists) {
        $conn->close();
        sendResponse(false, 'Email already exists');
    }

    $specialistCheckStmt = $conn->prepare('SELECT id FROM specialists WHERE id = ? LIMIT 1');
    if (!$specialistCheckStmt) {
        $conn->close();
        sendResponse(false, 'Failed to validate specialist');
    }
    $specialistCheckStmt->bind_param('i', $specialistId);
    $specialistCheckStmt->execute();
    $specialistExists = $specialistCheckStmt->get_result()->num_rows > 0;
    $specialistCheckStmt->close();
    if (!$specialistExists) {
        $conn->close();
        sendResponse(false, 'Selected specialist does not exist');
    }

    $branchCheckStmt = $conn->prepare('SELECT id FROM branches WHERE id = ? LIMIT 1');
    if (!$branchCheckStmt) {
        $conn->close();
        sendResponse(false, 'Failed to validate branch');
    }
    $branchCheckStmt->bind_param('i', $branchId);
    $branchCheckStmt->execute();
    $branchExists = $branchCheckStmt->get_result()->num_rows > 0;
    $branchCheckStmt->close();
    if (!$branchExists) {
        $conn->close();
        sendResponse(false, 'Selected branch does not exist');
    }

    $conn->begin_transaction();

    try {
        $updateUserStmt = $conn->prepare('UPDATE users SET full_name = ?, email = ?, phone = ?, date_of_birth = ?, gender = ? WHERE id = ?');
        if (!$updateUserStmt) {
            throw new Exception('Failed to prepare user update');
        }
        $updateUserStmt->bind_param('sssssi', $fullName, $email, $phone, $dateOfBirth, $gender, $userId);
        if (!$updateUserStmt->execute()) {
            throw new Exception('Failed to update doctor user profile');
        }
        $updateUserStmt->close();

        if ($password !== '' && $confirmPassword !== '') {
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            if ($passwordHash === false) {
                throw new Exception('Failed to hash password');
            }
            $passwordStmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            if (!$passwordStmt) {
                throw new Exception('Failed to prepare password update');
            }
            $passwordStmt->bind_param('si', $passwordHash, $userId);
            if (!$passwordStmt->execute()) {
                throw new Exception('Failed to update password');
            }
            $passwordStmt->close();
        }

        $updateDoctorStmt = $conn->prepare('UPDATE doctors SET specialist_id = ?, branch_id = ?, bio = ? WHERE id = ?');
        if (!$updateDoctorStmt) {
            throw new Exception('Failed to prepare doctor update');
        }
        $updateDoctorStmt->bind_param('iisi', $specialistId, $branchId, $bio, $doctorId);
        if (!$updateDoctorStmt->execute()) {
            throw new Exception('Failed to update doctor details');
        }
        $updateDoctorStmt->close();

        $conn->commit();
        $conn->close();

        sendResponse(true, 'Doctor updated successfully', [
            'doctor_id' => $doctorId
        ]);
    } catch (Exception $exception) {
        $conn->rollback();
        $conn->close();
        sendResponse(false, $exception->getMessage());
    }
}

$conn->close();
sendResponse(false, 'Method not allowed');
?>