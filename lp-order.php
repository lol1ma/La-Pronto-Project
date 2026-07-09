<?php
ini_set('display_errors', 0);
error_reporting(0);
set_time_limit(60);
header('Content-Type: application/json');

// QUICKPAY CREDENTIALS
define('QP_API_KEY',  'YOUR_QUICKPAY_API_KEY');
define('SITE_URL',    'https://la-pronto.dk');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'error' => 'Method not allowed']));
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Ugyldigt JSON-body']));
}

$ordreNr = preg_replace('/[^A-Z0-9\-]/', '', strtoupper($body['ordre_nr'] ?? ''));
$ordreNr = str_pad($ordreNr, 4, '0', STR_PAD_LEFT);
$amount  = intval($body['amount'] ?? 0);
$email   = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL) ? $body['email'] : null;

if (!$ordreNr || $amount < 1) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Mangler ordre_nr eller beløb']));
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'cURL ikke tilgængelig på serveren']));
}

function qp_call($method, $endpoint, $data = null) {
    $ch = curl_init('https://api.quickpay.net' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_CUSTOMREQUEST   => $method,
        CURLOPT_HTTPHEADER      => [
            'Accept-Version: v10',
            'Authorization: Basic ' . base64_encode(':' . QP_API_KEY),
            'Content-Type: application/json',
        ],
        CURLOPT_SSL_VERIFYPEER  => true,
        CURLOPT_TIMEOUT         => 20,
        CURLOPT_CONNECTTIMEOUT  => 8,
    ]);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $resp   = curl_exec($ch);
    $errno  = curl_errno($ch);
    $errmsg = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resp === false || $errno) {
        return ['status' => 0, 'body' => null, 'err' => "cURL #{$errno}: {$errmsg}"];
    }
    return ['status' => $status, 'body' => json_decode($resp, true), 'err' => null];
}

// 1. Opret betaling
$payment = qp_call('POST', '/payments', ['order_id' => $ordreNr, 'currency' => 'DKK']);

if (isset($payment['err']) && $payment['err']) {
    http_response_code(502);
    die(json_encode(['success' => false, 'error' => 'Netværksfejl: ' . $payment['err']]));
}

if ($payment['status'] !== 201 || empty($payment['body']['id'])) {
    http_response_code(502);
    die(json_encode(['success' => false, 'error' => 'QuickPay fejl (' . $payment['status'] . ')', 'detail' => $payment['body']]));
}

$paymentId = $payment['body']['id'];

// 2. Opret betalingslink
$link = qp_call('PUT', "/payments/{$paymentId}/link", [
    'amount'          => $amount,
    'continue_url'    => SITE_URL . '/?betaling=gennemfort&ordrenr=' . urlencode($ordreNr),
    'cancel_url'      => SITE_URL . '/?betaling=annulleret',
    'callback_url'    => SITE_URL . '/quickpay-callback.php',
    'language'        => 'da',
    'payment_methods' => '3d-dankort,3d-visa,3d-visa-electron,maestro,3d-mastercard,3d-mastercard-debet',
    'auto_capture'    => true,
    'customer_email'  => $email,
]);

if (isset($link['err']) && $link['err']) {
    http_response_code(502);
    die(json_encode(['success' => false, 'error' => 'Netværksfejl (link): ' . $link['err']]));
}

if ($link['status'] !== 200 || empty($link['body']['url'])) {
    http_response_code(502);
    die(json_encode(['success' => false, 'error' => 'QuickPay link fejl (' . $link['status'] . ')', 'detail' => $link['body']]));
}

echo json_encode(['success' => true, 'url' => $link['body']['url'], 'paymentId' => $paymentId]);
