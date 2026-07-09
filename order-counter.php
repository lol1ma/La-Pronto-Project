<?php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false]);
    exit;
}

$file = __DIR__ . '/order-count.json';
$fp = fopen($file, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Cannot open counter']);
    exit;
}
flock($fp, LOCK_EX);
$content = stream_get_contents($fp);
$data = $content ? json_decode($content, true) : null;
$next = (int)($data['last'] ?? 0) + 1;
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode(['last' => $next]));
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['success' => true, 'ordreNr' => $next]);
