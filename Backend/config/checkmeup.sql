
CREATE DATABASE IF NOT EXISTS checkmeup;
USE checkmeup;

-- ============================================
-- Table: users
-- Stores all users (patients, doctors, admins)
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Prefer not to say'),
    role ENUM('patient', 'doctor', 'admin') NOT NULL,
    insurance_company VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: branches
-- Stores clinic locations
-- ============================================
CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: specialists
-- Stores specialist types
-- ============================================
CREATE TABLE specialists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: doctors
-- Stores doctor profiles
-- ============================================
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specialist_id INT NOT NULL,
    branch_id INT NOT NULL,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE RESTRICT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: insurance_coverage
-- Stores which insurances each specialist accepts
-- ============================================
CREATE TABLE insurance_coverage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    specialist_id INT NOT NULL,
    insurance_company VARCHAR(100) NOT NULL,
    coverage_percent INT NOT NULL,
    FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: appointments
-- Stores all bookings
-- ============================================
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    branch_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: contact_messages
-- Stores messages from contact form
-- ============================================
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: login_attempts
-- Tracks failed login attempts for brute force protection
-- ============================================
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA INSERTION
-- ============================================

-- Insert Branches
INSERT INTO branches (name, address, city, phone) VALUES
('Check-me-up Philadelphia Main', '1500 Market Street, Philadelphia, PA', 'Philadelphia', '+1 (215) 555-0101'),
('Check-me-up Pittsburgh Branch', '100 Fifth Avenue, Pittsburgh, PA', 'Pittsburgh', '+1 (412) 555-0202'),
('Check-me-up Allentown Branch', '702 Hamilton Street, Allentown, PA', 'Allentown', '+1 (610) 555-0303');

-- Insert Specialists
INSERT INTO specialists (name) VALUES
('General Practitioner'),
('Cardiologist'),
('Dermatologist'),
('Pediatrician'),
('Neurologist'),
('Orthopedic');

-- Insert Insurance Coverage
-- Based on US insurance providers with realistic coverage percentages
INSERT INTO insurance_coverage (specialist_id, insurance_company, coverage_percent) VALUES
-- General Practitioner (id: 1)
(1, 'Blue Cross Blue Shield', 85),
(1, 'Aetna', 80),
(1, 'UnitedHealthcare', 85),
(1, 'Cigna', 80),
(1, 'Humana', 75),
(1, 'Medicare', 100),
(1, 'Medicaid', 100),
(1, 'Kaiser Permanente', 85),
(1, 'Anthem', 80),
(1, 'Oscar Health', 75),
-- Cardiologist (id: 2)
(2, 'Blue Cross Blue Shield', 80),
(2, 'Aetna', 75),
(2, 'UnitedHealthcare', 80),
(2, 'Cigna', 75),
(2, 'Humana', 70),
(2, 'Medicare', 100),
(2, 'Kaiser Permanente', 80),
(2, 'Anthem', 75),
-- Dermatologist (id: 3)
(3, 'Blue Cross Blue Shield', 75),
(3, 'Aetna', 70),
(3, 'UnitedHealthcare', 75),
(3, 'Humana', 65),
(3, 'Medicaid', 80),
(3, 'Kaiser Permanente', 75),
(3, 'Oscar Health', 70),
-- Pediatrician (id: 4)
(4, 'Blue Cross Blue Shield', 90),
(4, 'Aetna', 85),
(4, 'UnitedHealthcare', 90),
(4, 'Humana', 85),
(4, 'Medicare', 100),
(4, 'Medicaid', 100),
(4, 'Kaiser Permanente', 90),
(4, 'Oscar Health', 80),
-- Neurologist (id: 5)
(5, 'Blue Cross Blue Shield', 75),
(5, 'Aetna', 70),
(5, 'UnitedHealthcare', 80),
(5, 'Cigna', 75),
(5, 'Medicare', 100),
(5, 'Anthem', 70),
-- Orthopedic (id: 6)
(6, 'Blue Cross Blue Shield', 80),
(6, 'Aetna', 75),
(6, 'UnitedHealthcare', 80),
(6, 'Cigna', 70),
(6, 'Medicare', 100),
(6, 'Anthem', 75);

-- ============================================
-- INSERT ADMIN USERS (5 total)
-- Password: Admin123 (hashed with bcrypt)
-- ============================================
INSERT INTO users (full_name, email, phone, password_hash, date_of_birth, gender, role, insurance_company) VALUES
('Steven Collins', 'steven.collins@checkmeup.com', '+1 (215) 555-0301', '$2y$12$Nw3znp1Td3GWyTk9gLLhGuqAaTFyxCN0FQsCcuMeCF.EaOL0bHcFK', NULL, 'Male', 'admin', NULL),
('Nancy Edwards', 'nancy.edwards@checkmeup.com', '+1 (412) 555-0302', '$2y$12$Nw3znp1Td3GWyTk9gLLhGuqAaTFyxCN0FQsCcuMeCF.EaOL0bHcFK', NULL, 'Female', 'admin', NULL),
('George Murphy', 'george.murphy@checkmeup.com', '+1 (610) 555-0303', '$2y$12$Nw3znp1Td3GWyTk9gLLhGuqAaTFyxCN0FQsCcuMeCF.EaOL0bHcFK', NULL, 'Male', 'admin', NULL),
('Dorothy Bell', 'dorothy.bell@checkmeup.com', '+1 (215) 555-0304', '$2y$12$Nw3znp1Td3GWyTk9gLLhGuqAaTFyxCN0FQsCcuMeCF.EaOL0bHcFK', NULL, 'Female', 'admin', NULL),
('Kenneth Howard', 'kenneth.howard@checkmeup.com', '+1 (412) 555-0305', '$2y$12$Nw3znp1Td3GWyTk9gLLhGuqAaTFyxCN0FQsCcuMeCF.EaOL0bHcFK', NULL, 'Male', 'admin', NULL);

-- ============================================
-- INSERT PATIENTS (25 total)
-- Password: Patient123 (hashed with bcrypt)
-- ============================================
INSERT INTO users (full_name, email, phone, password_hash, date_of_birth, gender, role, insurance_company) VALUES
('James Carter', 'james.carter@gmail.com', '+1 (215) 555-0101', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1990-03-14', 'Male', 'patient', 'Blue Cross Blue Shield'),
('Emily Rodriguez', 'emily.rodriguez@gmail.com', '+1 (215) 555-0102', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1985-07-22', 'Female', 'patient', 'Aetna'),
('Michael Thompson', 'michael.thompson@gmail.com', '+1 (412) 555-0103', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1992-11-08', 'Male', 'patient', 'UnitedHealthcare'),
('Ashley Williams', 'ashley.williams@gmail.com', '+1 (610) 555-0104', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1988-05-30', 'Female', 'patient', 'Cigna'),
('David Martinez', 'david.martinez@gmail.com', '+1 (215) 555-0105', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1995-01-17', 'Male', 'patient', 'Humana'),
('Jessica Brown', 'jessica.brown@gmail.com', '+1 (412) 555-0106', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1991-09-25', 'Female', 'patient', 'Medicare'),
('Christopher Davis', 'chris.davis@gmail.com', '+1 (610) 555-0107', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1983-12-03', 'Male', 'patient', 'Medicaid'),
('Amanda Wilson', 'amanda.wilson@gmail.com', '+1 (215) 555-0108', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1997-04-19', 'Female', 'patient', 'Kaiser Permanente'),
('Daniel Anderson', 'daniel.anderson@gmail.com', '+1 (412) 555-0109', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1989-08-11', 'Male', 'patient', 'Anthem'),
('Stephanie Taylor', 'stephanie.taylor@gmail.com', '+1 (610) 555-0110', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1994-02-28', 'Female', 'patient', 'Oscar Health'),
('Kevin Thomas', 'kevin.thomas@gmail.com', '+1 (215) 555-0111', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1986-06-15', 'Male', 'patient', 'Blue Cross Blue Shield'),
('Rachel Jackson', 'rachel.jackson@gmail.com', '+1 (412) 555-0112', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1993-10-07', 'Female', 'patient', 'Aetna'),
('Brandon White', 'brandon.white@gmail.com', '+1 (610) 555-0113', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1990-03-22', 'Male', 'patient', 'UnitedHealthcare'),
('Melissa Harris', 'melissa.harris@gmail.com', '+1 (215) 555-0114', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1987-07-14', 'Female', 'patient', 'Cigna'),
('Tyler Clark', 'tyler.clark@gmail.com', '+1 (412) 555-0115', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1996-11-30', 'Male', 'patient', 'Humana'),
('Lauren Lewis', 'lauren.lewis@gmail.com', '+1 (610) 555-0116', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1984-01-09', 'Female', 'patient', 'Medicare'),
('Nathan Robinson', 'nathan.robinson@gmail.com', '+1 (215) 555-0117', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1991-05-18', 'Male', 'patient', 'Medicaid'),
('Brittany Walker', 'brittany.walker@gmail.com', '+1 (412) 555-0118', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1988-09-03', 'Female', 'patient', 'Kaiser Permanente'),
('Justin Hall', 'justin.hall@gmail.com', '+1 (610) 555-0119', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1995-02-24', 'Male', 'patient', 'Anthem'),
('Samantha Allen', 'samantha.allen@gmail.com', '+1 (215) 555-0120', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1992-06-11', 'Female', 'patient', 'Oscar Health'),
('Ryan Young', 'ryan.young@gmail.com', '+1 (412) 555-0121', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1986-10-27', 'Male', 'patient', 'Blue Cross Blue Shield'),
('Kayla King', 'kayla.king@gmail.com', '+1 (610) 555-0122', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1993-03-16', 'Female', 'patient', 'Aetna'),
('Austin Scott', 'austin.scott@gmail.com', '+1 (215) 555-0123', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1989-07-05', 'Male', 'patient', 'UnitedHealthcare'),
('Megan Green', 'megan.green@gmail.com', '+1 (412) 555-0124', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1997-12-21', 'Female', 'patient', 'Cigna'),
('Zachary Baker', 'zachary.baker@gmail.com', '+1 (610) 555-0125', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1984-04-08', 'Male', 'patient', 'Humana');

-- ============================================
-- INSERT DOCTOR USERS (10 total)
-- Password: Doctor123 (hashed with bcrypt)
-- ============================================
INSERT INTO users (full_name, email, phone, password_hash, date_of_birth, gender, role, insurance_company) VALUES
('Dr. Robert Mitchell', 'robert.mitchell@checkmeup.com', '+1 (215) 555-0201', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1975-04-12', 'Male', 'doctor', NULL),
('Dr. Jennifer Chen', 'jennifer.chen@checkmeup.com', '+1 (215) 555-0202', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1980-08-23', 'Female', 'doctor', NULL),
('Dr. William Hayes', 'william.hayes@checkmeup.com', '+1 (412) 555-0203', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1972-11-05', 'Male', 'doctor', NULL),
('Dr. Patricia Nguyen', 'patricia.nguyen@checkmeup.com', '+1 (412) 555-0204', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1978-02-17', 'Female', 'doctor', NULL),
('Dr. Charles Morgan', 'charles.morgan@checkmeup.com', '+1 (610) 555-0205', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1976-06-30', 'Male', 'doctor', NULL),
('Dr. Sandra Phillips', 'sandra.phillips@checkmeup.com', '+1 (610) 555-0206', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1983-09-14', 'Female', 'doctor', NULL),
('Dr. Thomas Rivera', 'thomas.rivera@checkmeup.com', '+1 (215) 555-0207', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1970-01-28', 'Male', 'doctor', NULL),
('Dr. Linda Cooper', 'linda.cooper@checkmeup.com', '+1 (412) 555-0208', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1981-05-19', 'Female', 'doctor', NULL),
('Dr. Mark Richardson', 'mark.richardson@checkmeup.com', '+1 (610) 555-0209', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1977-10-07', 'Male', 'doctor', NULL),
('Dr. Barbara Turner', 'barbara.turner@checkmeup.com', '+1 (215) 555-0210', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1979-03-25', 'Female', 'doctor', NULL);

-- ============================================
-- INSERT DOCTOR PROFILES (10 total)
-- Linking users to specialists and branches
-- ============================================
INSERT INTO doctors (user_id, specialist_id, branch_id, bio, is_active) VALUES
-- Dr. Robert Mitchell - General Practitioner (user_id: 31, specialist_id: 1)
(31, 1, 1, 'Experienced General Practitioner with over 20 years of practice in Pennsylvania.', TRUE),
-- Dr. Jennifer Chen - Cardiologist (user_id: 32, specialist_id: 2)
(32, 2, 1, 'Experienced Cardiologist with over 18 years of practice in Pennsylvania.', TRUE),
-- Dr. William Hayes - Dermatologist (user_id: 33, specialist_id: 3)
(33, 3, 2, 'Experienced Dermatologist with over 25 years of practice in Pennsylvania.', TRUE),
-- Dr. Patricia Nguyen - Pediatrician (user_id: 34, specialist_id: 4)
(34, 4, 2, 'Experienced Pediatrician with over 15 years of practice in Pennsylvania.', TRUE),
-- Dr. Charles Morgan - Neurologist (user_id: 35, specialist_id: 5)
(35, 5, 3, 'Experienced Neurologist with over 18 years of practice in Pennsylvania.', TRUE),
-- Dr. Sandra Phillips - Orthopedic (user_id: 36, specialist_id: 6)
(36, 6, 3, 'Experienced Orthopedic specialist with over 16 years of practice in Pennsylvania.', TRUE),
-- Dr. Thomas Rivera - Cardiologist (user_id: 37, specialist_id: 2)
(37, 2, 1, 'Experienced Cardiologist with over 28 years of practice in Pennsylvania.', TRUE),
-- Dr. Linda Cooper - General Practitioner (user_id: 38, specialist_id: 1)
(38, 1, 2, 'Experienced General Practitioner with over 14 years of practice in Pennsylvania.', TRUE),
-- Dr. Mark Richardson - Neurologist (user_id: 39, specialist_id: 5)
(39, 5, 1, 'Experienced Neurologist with over 17 years of practice in Pennsylvania.', TRUE),
-- Dr. Barbara Turner - Pediatrician (user_id: 40, specialist_id: 4)
(40, 4, 3, 'Experienced Pediatrician with over 12 years of practice in Pennsylvania.', TRUE);

-- ============================================
-- INSERT SAMPLE APPOINTMENTS (15 total)
-- Mixed statuses: pending, confirmed, completed, cancelled
-- ============================================
INSERT INTO appointments (patient_id, doctor_id, branch_id, appointment_date, appointment_time, status) VALUES
-- James Carter (patient_id: 6)
(6, 1, 1, '2026-04-15', '10:00:00', 'confirmed'),
(6, 2, 1, '2026-03-10', '14:30:00', 'completed'),

-- Emily Rodriguez (patient_id: 7)
(7, 3, 2, '2026-05-01', '09:00:00', 'pending'),
(7, 1, 1, '2026-02-15', '11:00:00', 'completed'),

-- Michael Thompson (patient_id: 8)
(8, 4, 2, '2026-04-20', '13:00:00', 'confirmed'),
(8, 5, 3, '2026-01-30', '15:00:00', 'completed'),

-- Ashley Williams (patient_id: 9)
(9, 6, 3, '2026-04-25', '10:30:00', 'pending'),
(9, 3, 2, '2026-03-05', '14:00:00', 'cancelled'),

-- David Martinez (patient_id: 10)
(10, 7, 1, '2026-05-10', '11:00:00', 'confirmed'),
(10, 4, 2, '2026-02-20', '09:30:00', 'completed'),

-- Jessica Brown (patient_id: 11)
(11, 8, 2, '2026-04-18', '15:00:00', 'pending'),
(11, 2, 1, '2026-01-25', '10:00:00', 'completed'),

-- Christopher Davis (patient_id: 12)
(12, 9, 1, '2026-05-05', '13:30:00', 'confirmed'),
(12, 6, 3, '2026-03-15', '11:30:00', 'completed'),

-- Amanda Wilson (patient_id: 13)
(13, 1, 1, '2026-04-12', '09:00:00', 'pending');

-- ============================================
-- Create Indexes for Performance
-- ============================================

-- Index on users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Index on appointments table
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Index on doctors table
CREATE INDEX idx_doctors_specialist ON doctors(specialist_id);
CREATE INDEX idx_doctors_branch ON doctors(branch_id);
CREATE INDEX idx_doctors_active ON doctors(is_active);

-- Index on insurance_coverage table
CREATE INDEX idx_insurance_specialist ON insurance_coverage(specialist_id);
CREATE INDEX idx_insurance_company ON insurance_coverage(insurance_company);

