<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Password is only here on the server — never in JavaScript
define('ADMIN_PASSWORD', 'YOUR_ADMIN_PASSWORD');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if already logged in
    echo json_encode(['loggedIn' => !empty($_SESSION['lp_admin'])]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $pw   = $body['password'] ?? '';

    $passFile = __DIR__ . '/admin-pass.json';
    if (file_exists($passFile)) {
        $stored = json_decode(file_get_contents($passFile), true);
        $ok = password_verify($pw, $stored['hash'] ?? '');
    } else {
        $ok = ($pw === ADMIN_PASSWORD);
    }

    if ($ok) {
        session_regenerate_id(true);
        $_SESSION['lp_admin'] = true;
        echo json_encode(['success' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Forkert adgangskode']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
