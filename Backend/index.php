<?php
header('Content-Type: application/json');

echo json_encode([
  'success' => true,
  'message' => 'Check-me-up API is running',
  'version' => '1.0',
  'group' => 'DS440 Group 12'
]);
?>
