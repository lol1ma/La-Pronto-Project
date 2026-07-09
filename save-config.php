<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if (empty($_SESSION['lp_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$raw = file_get_contents('php://input');
if (empty($raw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Empty request body']);
    exit;
}

$data = json_decode($raw, true);
if ($data === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

if (!isset($data['hours'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing hours field']);
    exit;
}

// Validate time fields
$timeFields = ['weekdayOpen', 'weekendOpen', 'close', 'onlineClose'];
foreach ($timeFields as $f) {
    if (!isset($data['hours'][$f]) || !preg_match('/^\d{1,2}:\d{2}$/', $data['hours'][$f])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid time: ' . $f]);
        exit;
    }
}

$result = file_put_contents(__DIR__ . '/config.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not write config.json']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'config.json updated']);
