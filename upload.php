<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Password');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$adminPassword = 'YOUR_ADMIN_PASSWORD';
$password = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';

if ($password !== $adminPassword) {
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

$body = json_decode($raw, true);
if (!isset($body['data']) || !isset($body['filename'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing data or filename']);
    exit;
}

// Parse base64 data URL: "data:image/jpeg;base64,/9j/4AAQ..."
$dataUrl = $body['data'];
if (!preg_match('/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/s', $dataUrl, $m)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid image format. Only JPEG, PNG, WebP or GIF allowed.']);
    exit;
}

$mime    = $m[1];
$imgData = base64_decode($m[2], true);
if ($imgData === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Base64 decode failed']);
    exit;
}

// Max 8 MB decoded
if (strlen($imgData) > 8 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Image too large (max 8 MB). Compress it first.']);
    exit;
}

$extMap   = ['image/jpeg' => 'jpg', 'image/jpg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
$ext      = $extMap[$mime] ?? 'jpg';
$baseName = preg_replace('/[^a-z0-9_-]/', '', strtolower(pathinfo($body['filename'], PATHINFO_FILENAME)));
if ($baseName === '') $baseName = 'upload';
$filename = $baseName . '_' . uniqid() . '.' . $ext;

$imagesDir = __DIR__ . '/images/';
if (!is_dir($imagesDir)) {
    if (!@mkdir($imagesDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'images/ directory could not be created']);
        exit;
    }
}
if (!is_writable($imagesDir)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'images/ directory is not writable on this server']);
    exit;
}

if (file_put_contents($imagesDir . $filename, $imgData) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not write file to images/']);
    exit;
}

echo json_encode(['success' => true, 'path' => 'images/' . $filename]);
