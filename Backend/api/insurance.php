<?php
require_once '../config/cors.php';
require_once '../config/db.php';
require_once '../config/helpers.php';

session_start();

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  sendResponse(false, "Method not allowed");
}

// Mode 1: Coverage check for specific specialist (?specialist=X)
if (isset($_GET['specialist'])) {
  $specialistName = validateInput($_GET['specialist']);
  
  if (empty($specialistName)) {
    sendResponse(false, "Specialist name is required");
  }

  // Get patient's insurance from session (null if not logged in)
  $patientInsurance = isset($_SESSION['user_insurance']) ? normalizeInsuranceCompany($_SESSION['user_insurance']) : null;

  // Query all insurance coverage for this specialist
  $sql = "SELECT ic.insurance_company, ic.coverage_percent
          FROM insurance_coverage ic
          JOIN specialists s ON ic.specialist_id = s.id
          WHERE s.name = ?";
  
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("s", $specialistName);
  $stmt->execute();
  $result = $stmt->get_result();

  $acceptedInsurances = [];
  $isCovered = false;
  $coveragePercent = null;

  while ($row = $result->fetch_assoc()) {
    $company = normalizeInsuranceCompany($row['insurance_company']);
    $acceptedInsurances[] = $company;
    
    // Check if patient's insurance matches
    if ($patientInsurance && $company === $patientInsurance) {
      $isCovered = true;
      $coveragePercent = (int)$row['coverage_percent'];
    }
  }

  $stmt->close();

  // Calculate copay
  $copayPercent = $coveragePercent ? (100 - $coveragePercent) : null;

  $data = [
    'specialist' => $specialistName,
    'patient_insurance' => $patientInsurance,
    'is_covered' => $isCovered,
    'coverage_percent' => $coveragePercent,
    'copay_percent' => $copayPercent,
    'accepted_insurances' => $acceptedInsurances
  ];

  sendResponse(true, "Coverage data retrieved", $data);
}

// Mode 2: Full pricing table (?table=true)
elseif (isset($_GET['table'])) {
  $sql = "SELECT s.name as specialist, ic.insurance_company, ic.coverage_percent
          FROM insurance_coverage ic
          JOIN specialists s ON ic.specialist_id = s.id
          ORDER BY s.name ASC, ic.insurance_company ASC";
  
  $stmt = $conn->prepare($sql);
  if (!$stmt) {
    $conn->close();
    sendResponse(false, "Could not load pricing table");
  }

  $stmt->execute();
  $result = $stmt->get_result();

  $pricingData = [];
  while ($row = $result->fetch_assoc()) {
    $company = normalizeInsuranceCompany($row['insurance_company']);
    $pricingData[] = [
      'specialist' => $row['specialist'],
      'insurance_company' => $company,
      'coverage_percent' => (int)$row['coverage_percent'],
      'copay_percent' => 100 - (int)$row['coverage_percent']
    ];
  }

  $stmt->close();

  sendResponse(true, "Pricing table retrieved", $pricingData);
}

// No valid mode specified
else {
  sendResponse(false, "Invalid request. Use ?specialist=X or ?table=true");
}

$conn->close();
?>
