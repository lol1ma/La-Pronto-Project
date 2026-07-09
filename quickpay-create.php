<?php
ini_set('display_errors', 0);
error_reporting(0);
ob_start();
header('Content-Type: application/json');

// QUICKPAY CREDENTIALS
define('QP_API_KEY',     'YOUR_QUICKPAY_API_KEY');
define('QP_PRIVATE_KEY', 'YOUR_QUICKPAY_PRIVATE_KEY');
define('SITE_URL', 'https://la-pronto.dk');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

$ordreNr  = preg_replace('/[^A-Z0-9\-]/', '', strtoupper($body['ordre_nr'] ?? ''));
$ordreNr  = str_pad($ordreNr, 4, '0', STR_PAD_LEFT);
$amount   = intval($body['amount'] ?? 0);

if (!$ordreNr || $amount < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Mangler ordre_nr eller beløb']);
    exit;
}

function qp($method, $endpoint, $data = null) {
    $ch = curl_init('https://api.quickpay.net' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => [
            'Accept-Version: v10',
            'Authorization: Basic ' . base64_encode(':' . QP_API_KEY),
            'Content-Type: application/json',
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $resp   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'body' => json_decode($resp, true)];
}

// 1. Opret betaling
$payment = qp('POST', '/payments', [
    'order_id' => $ordreNr,
    'currency' => 'DKK',
]);

if ($payment['status'] !== 201 || empty($payment['body']['id'])) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Quickpay: kunne ikke oprette betaling', 'detail' => $payment['body']]);
    exit;
}

$paymentId = $payment['body']['id'];

// 2. Opret betalingslink
$link = qp('PUT', "/payments/$paymentId/link", [
    'amount'          => $amount,
    'continue_url'    => SITE_URL . '/?betaling=gennemfort&ordrenr=' . urlencode($ordreNr),
    'cancel_url'      => SITE_URL . '/?betaling=annulleret',
    'callback_url'    => SITE_URL . '/quickpay-callback.php',
    'language'        => 'da',
    'payment_methods' => '3d-dankort,3d-visa,3d-visa-electron,maestro,3d-mastercard,3d-mastercard-debet',
    'auto_capture'    => true,
]);

if ($link['status'] !== 200 || empty($link['body']['url'])) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Quickpay: kunne ikke oprette betalingslink', 'detail' => $link['body']]);
    exit;
}

echo json_encode([
    'success'   => true,
    'url'       => $link['body']['url'],
    'paymentId' => $paymentId,
]);
