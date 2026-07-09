<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

if (empty($_SESSION['lp_admin'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Ikke logget ind']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$current = $body['current'] ?? '';
$new     = $body['new']     ?? '';

if (strlen($new) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nyt kodeord skal være mindst 6 tegn']);
    exit;
}

// Load stored password (file or fallback to auth.php constant)
$passFile = __DIR__ . '/admin-pass.json';
if (file_exists($passFile)) {
    $stored = json_decode(file_get_contents($passFile), true);
    $valid  = password_verify($current, $stored['hash'] ?? '');
} else {
    $valid = ($current === 'YOUR_ADMIN_PASSWORD');
}

if (!$valid) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Nuværende kodeord er forkert']);
    exit;
}

// Save new hashed password
$hash = password_hash($new, PASSWORD_BCRYPT);
file_put_contents($passFile, json_encode(['hash' => $hash]));

// Send notification email
$smtp_host = 'send.one.com';
$smtp_port = 465;
$smtp_user = 'orderprint@la-pronto.dk';
$smtp_pass = 'YOUR_SMTP_PASSWORD';
$smtp_from = 'orderprint@la-pronto.dk';
$notify_to = 'your@email.com';

$subject = 'La Pronto Admin – Kodeord ændret';
$body_html = "
<div style='font-family:Arial,sans-serif;max-width:500px;margin:0 auto;'>
  <div style='background:#2E163F;padding:16px 20px;text-align:center;'>
    <h1 style='color:#fff;font-size:20px;margin:0;'>La Pronto Pizza</h1>
  </div>
  <div style='background:#fff;padding:24px;'>
    <p style='font-size:16px;'>Admin-kodeordet på <strong>la-pronto.dk</strong> er netop blevet ændret.</p>
    <p style='font-size:14px;color:#666;'>Hvis du ikke selv har gjort dette, bør du straks kontakte din webmaster.</p>
  </div>
</div>";

$boundary = md5(uniqid());
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
$headers .= "From: La Pronto Pizza <{$smtp_from}>\r\n";
$headers .= "To: {$notify_to}\r\n";
$headers .= "Subject: {$subject}\r\n";

$msg  = "--{$boundary}\r\n";
$msg .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
$msg .= $body_html . "\r\n";
$msg .= "--{$boundary}--\r\n";

$ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
$sock = @stream_socket_client("ssl://{$smtp_host}:{$smtp_port}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);

if ($sock) {
    fgets($sock);
    fwrite($sock, "EHLO la-pronto.dk\r\n"); fgets($sock);
    fwrite($sock, "AUTH LOGIN\r\n");         fgets($sock);
    fwrite($sock, base64_encode($smtp_user) . "\r\n"); fgets($sock);
    fwrite($sock, base64_encode($smtp_pass) . "\r\n"); fgets($sock);
    fwrite($sock, "MAIL FROM:<{$smtp_from}>\r\n"); fgets($sock);
    fwrite($sock, "RCPT TO:<{$notify_to}>\r\n");   fgets($sock);
    fwrite($sock, "DATA\r\n");               fgets($sock);
    fwrite($sock, $headers . "\r\n" . $msg . ".\r\n"); fgets($sock);
    fwrite($sock, "QUIT\r\n");
    fclose($sock);
}

echo json_encode(['success' => true]);
