-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 23, 2026 at 11:35 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `checkmeup`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `patient_id`, `doctor_id`, `branch_id`, `appointment_date`, `appointment_time`, `status`, `created_at`) VALUES
(1, 2, 1, 1, '2026-03-15', '10:00:00', 'confirmed', '2026-03-22 22:33:25'),
(2, 2, 5, 1, '2026-02-10', '14:30:00', 'completed', '2026-03-22 22:33:25'),
(3, 2, 7, 2, '2026-01-20', '11:00:00', 'completed', '2026-03-22 22:33:25');

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `address`, `city`, `phone`, `created_at`) VALUES
(1, 'Check-me-up Philadelphia Main', '1500 Market Street, Philadelphia, PA', 'Philadelphia', '+1 (215) 555-0101', '2026-03-22 22:33:24'),
(2, 'Check-me-up Pittsburgh Branch', '100 Fifth Avenue, Pittsburgh, PA', 'Pittsburgh', '+1 (412) 555-0202', '2026-03-22 22:33:24'),
(3, 'Check-me-up Allentown Branch', '702 Hamilton Street, Allentown, PA', 'Allentown', '+1 (610) 555-0303', '2026-03-22 22:33:24');

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `doctors`
--

CREATE TABLE `doctors` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `specialist_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `bio` text DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT 0.0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `doctors`
--

INSERT INTO `doctors` (`id`, `user_id`, `specialist_id`, `branch_id`, `bio`, `rating`, `is_active`, `created_at`) VALUES
(1, 3, 1, 1, 'Experienced GP with 15+ years in family medicine. Specializes in preventive care and chronic disease management.', 4.8, 1, '2026-03-22 22:33:25'),
(2, 4, 1, 2, 'Board-certified family physician dedicated to comprehensive patient care and wellness.', 4.7, 1, '2026-03-22 22:33:25'),
(3, 5, 2, 1, 'Leading cardiologist with expertise in interventional cardiology and heart disease prevention.', 4.9, 1, '2026-03-22 22:33:25'),
(4, 6, 2, 3, 'Specialized in non-invasive cardiology, echocardiography, and cardiac rehabilitation.', 4.6, 1, '2026-03-22 22:33:25'),
(5, 7, 3, 2, 'Expert dermatologist focusing on medical and cosmetic dermatology with 12 years experience.', 4.7, 1, '2026-03-22 22:33:25'),
(6, 8, 3, 1, 'Specialized in treating complex skin conditions, acne, and anti-aging treatments.', 4.8, 1, '2026-03-22 22:33:25'),
(7, 9, 4, 3, 'Caring pediatrician with focus on child development, vaccinations, and pediatric care.', 4.9, 1, '2026-03-22 22:33:25'),
(8, 10, 4, 2, 'Experienced in newborn care, childhood illnesses, and adolescent medicine.', 4.8, 1, '2026-03-22 22:33:25'),
(9, 11, 5, 1, 'Neurologist specializing in headaches, epilepsy, and movement disorders.', 4.6, 1, '2026-03-22 22:33:25'),
(10, 12, 5, 3, 'Expert in stroke management, neurodegenerative diseases, and sleep disorders.', 4.7, 1, '2026-03-22 22:33:25'),
(11, 13, 6, 2, 'Orthopedic surgeon with expertise in sports injuries and joint replacement.', 4.8, 1, '2026-03-22 22:33:25'),
(12, 14, 6, 1, 'Specialized in spine surgery, trauma care, and musculoskeletal disorders.', 4.9, 1, '2026-03-22 22:33:25');

-- --------------------------------------------------------

--
-- Table structure for table `insurance_coverage`
--

CREATE TABLE `insurance_coverage` (
  `id` int(11) NOT NULL,
  `specialist_id` int(11) NOT NULL,
  `insurance_company` varchar(100) NOT NULL,
  `coverage_percent` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `insurance_coverage`
--

INSERT INTO `insurance_coverage` (`id`, `specialist_id`, `insurance_company`, `coverage_percent`) VALUES
(1, 1, 'Blue Cross Blue Shield', 85),
(2, 1, 'Aetna', 80),
(3, 1, 'UnitedHealthcare', 85),
(4, 1, 'Cigna', 80),
(5, 1, 'Humana', 75),
(6, 1, 'Medicare', 100),
(7, 1, 'Medicaid', 100),
(8, 1, 'Kaiser Permanente', 85),
(9, 1, 'Anthem', 80),
(10, 1, 'Oscar Health', 75),
(11, 2, 'Blue Cross Blue Shield', 80),
(12, 2, 'Aetna', 75),
(13, 2, 'UnitedHealthcare', 80),
(14, 2, 'Cigna', 75),
(15, 2, 'Humana', 70),
(16, 2, 'Medicare', 100),
(17, 2, 'Kaiser Permanente', 80),
(18, 2, 'Anthem', 75),
(19, 3, 'Blue Cross Blue Shield', 75),
(20, 3, 'Aetna', 70),
(21, 3, 'UnitedHealthcare', 75),
(22, 3, 'Humana', 65),
(23, 3, 'Medicaid', 80),
(24, 3, 'Kaiser Permanente', 75),
(25, 3, 'Oscar Health', 70),
(26, 4, 'Blue Cross Blue Shield', 90),
(27, 4, 'Aetna', 85),
(28, 4, 'UnitedHealthcare', 90),
(29, 4, 'Humana', 85),
(30, 4, 'Medicare', 100),
(31, 4, 'Medicaid', 100),
(32, 4, 'Kaiser Permanente', 90),
(33, 4, 'Oscar Health', 80),
(34, 5, 'Blue Cross Blue Shield', 75),
(35, 5, 'Aetna', 70),
(36, 5, 'UnitedHealthcare', 80),
(37, 5, 'Cigna', 75),
(38, 5, 'Medicare', 100),
(39, 5, 'Anthem', 70),
(40, 6, 'Blue Cross Blue Shield', 80),
(41, 6, 'Aetna', 75),
(42, 6, 'UnitedHealthcare', 80),
(43, 6, 'Cigna', 70),
(44, 6, 'Medicare', 100),
(45, 6, 'Anthem', 75);

-- --------------------------------------------------------

--
-- Table structure for table `specialists`
--

CREATE TABLE `specialists` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `specialists`
--

INSERT INTO `specialists` (`id`, `name`) VALUES
(1, 'General Practitioner'),
(2, 'Cardiologist'),
(3, 'Dermatologist'),
(4, 'Pediatrician'),
(5, 'Neurologist'),
(6, 'Orthopedic');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('Male','Female','Prefer not to say') DEFAULT NULL,
  `role` enum('patient','doctor','admin') NOT NULL,
  `insurance_company` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `date_of_birth`, `gender`, `role`, `insurance_company`, `created_at`) VALUES
(1, 'System Administrator', 'admin@checkmeup.com', '+1 (215) 555-0100', '$2y$12$Nw3znp1Td3GWyTk9gLLhGuqAaTFyxCN0FQsCcuMeCF.EaOL0bHcFK', '1985-01-15', 'Prefer not to say', 'admin', NULL, '2026-03-22 22:33:24'),
(2, 'Sarah Thompson', 'sarah@checkmeup.com', '+1 (215) 555-0199', '$2y$12$IIE7guvllK1IC8sgeE6KtODoqjH5sHcagvwCp.7dg5Wq6voh0QPEC', '1995-06-20', 'Female', 'patient', 'Blue Cross Blue Shield', '2026-03-22 22:33:25'),
(3, 'Dr. James Mitchell', 'dr.mitchell@checkmeup.com', '+1 (215) 555-0301', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1980-03-12', 'Male', 'doctor', NULL, '2026-03-22 22:33:25'),
(4, 'Dr. Sarah Chen', 'dr.chen@checkmeup.com', '+1 (215) 555-0302', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1982-07-25', 'Female', 'doctor', NULL, '2026-03-22 22:33:25'),
(5, 'Dr. Robert Williams', 'dr.williams@checkmeup.com', '+1 (215) 555-0303', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1978-11-08', 'Male', 'doctor', NULL, '2026-03-22 22:33:25'),
(6, 'Dr. Emily Davis', 'dr.davis@checkmeup.com', '+1 (215) 555-0304', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1985-04-15', 'Female', 'doctor', NULL, '2026-03-22 22:33:25'),
(7, 'Dr. Michael Brown', 'dr.brown@checkmeup.com', '+1 (215) 555-0305', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1979-09-20', 'Male', 'doctor', NULL, '2026-03-22 22:33:25'),
(8, 'Dr. Jessica Taylor', 'dr.taylor@checkmeup.com', '+1 (215) 555-0306', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1987-02-10', 'Female', 'doctor', NULL, '2026-03-22 22:33:25'),
(9, 'Dr. David Anderson', 'dr.anderson@checkmeup.com', '+1 (215) 555-0307', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1981-12-05', 'Male', 'doctor', NULL, '2026-03-22 22:33:25'),
(10, 'Dr. Ashley Johnson', 'dr.johnson@checkmeup.com', '+1 (215) 555-0308', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1986-08-18', 'Female', 'doctor', NULL, '2026-03-22 22:33:25'),
(11, 'Dr. Christopher Lee', 'dr.lee@checkmeup.com', '+1 (215) 555-0309', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1977-05-30', 'Male', 'doctor', NULL, '2026-03-22 22:33:25'),
(12, 'Dr. Amanda Wilson', 'dr.wilson@checkmeup.com', '+1 (215) 555-0310', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1984-10-22', 'Female', 'doctor', NULL, '2026-03-22 22:33:25'),
(13, 'Dr. Daniel Martinez', 'dr.martinez@checkmeup.com', '+1 (215) 555-0311', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1983-01-14', 'Male', 'doctor', NULL, '2026-03-22 22:33:25'),
(14, 'Dr. Stephanie Thomas', 'dr.thomas@checkmeup.com', '+1 (215) 555-0312', '$2y$12$JxroZPn4InyzP6k/Qdgwk.WjbutGrABSvGXeOVmSQQOweFDD1dgP6', '1988-06-28', 'Female', 'doctor', NULL, '2026-03-22 22:33:25');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `idx_appointments_patient` (`patient_id`),
  ADD KEY `idx_appointments_doctor` (`doctor_id`),
  ADD KEY `idx_appointments_date` (`appointment_date`),
  ADD KEY `idx_appointments_status` (`status`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `doctors`
--
ALTER TABLE `doctors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_doctors_specialist` (`specialist_id`),
  ADD KEY `idx_doctors_branch` (`branch_id`),
  ADD KEY `idx_doctors_active` (`is_active`);

--
-- Indexes for table `insurance_coverage`
--
ALTER TABLE `insurance_coverage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_insurance_specialist` (`specialist_id`),
  ADD KEY `idx_insurance_company` (`insurance_company`);

--
-- Indexes for table `specialists`
--
ALTER TABLE `specialists`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `doctors`
--
ALTER TABLE `doctors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `insurance_coverage`
--
ALTER TABLE `insurance_coverage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `specialists`
--
ALTER TABLE `specialists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `doctors`
--
ALTER TABLE `doctors`
  ADD CONSTRAINT `doctors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctors_ibfk_2` FOREIGN KEY (`specialist_id`) REFERENCES `specialists` (`id`),
  ADD CONSTRAINT `doctors_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `insurance_coverage`
--
ALTER TABLE `insurance_coverage`
  ADD CONSTRAINT `insurance_coverage_ibfk_1` FOREIGN KEY (`specialist_id`) REFERENCES `specialists` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
