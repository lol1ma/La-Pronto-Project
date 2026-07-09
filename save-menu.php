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

$body = json_decode($raw, true);
if ($body === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

// IMAGE UPLOAD (action=upload)
if (($body['action'] ?? '') === 'upload') {
    if (!isset($body['data']) || !isset($body['filename'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing data or filename']);
        exit;
    }

    if (!preg_match('/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/s', $body['data'], $m)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid image format. Only JPEG, PNG, WebP, GIF allowed.']);
        exit;
    }

    $imgData = base64_decode($m[2], true);
    if ($imgData === false || strlen($imgData) > 8 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Image too large (max 8 MB) or corrupt']);
        exit;
    }

    $ext      = ['image/jpeg'=>'jpg','image/jpg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$m[1]] ?? 'jpg';
    $baseName = preg_replace('/[^a-z0-9_-]/', '', strtolower(pathinfo($body['filename'], PATHINFO_FILENAME)));
    if ($baseName === '') $baseName = 'upload';
    $filename  = $baseName . '_' . uniqid() . '.' . $ext;
    $imagesDir = __DIR__ . '/images/';

    if (!is_dir($imagesDir) && !@mkdir($imagesDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not create images/ directory']);
        exit;
    }
    if (!is_writable($imagesDir)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'images/ directory is not writable on this server']);
        exit;
    }
    if (file_put_contents($imagesDir . $filename, $imgData) === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not write image file']);
        exit;
    }

    echo json_encode(['success' => true, 'path' => 'images/' . $filename]);
    exit;
}

// SAVE MENU
$allowed = ['Pizza','Durum','LimitedEdition','Grill','Børnemenu','Pasta','Salater','Desserter','Drikkevarer','Hjemmelavet Chilli'];
foreach (array_keys($body) as $key) {
    if (!in_array($key, $allowed)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid category: ' . $key]);
        exit;
    }
}

$result = file_put_contents(__DIR__ . '/menu.json', json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not write menu.json — check file permissions']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'menu.json updated']);
