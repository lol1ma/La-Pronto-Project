<?php
// Quickpay kalder dette endpoint når betalingsstatus ændrer sig.
// Bekræft checksum → log ordren.

define('QP_PRIVATE_KEY', 'YOUR_QUICKPAY_PRIVATE_KEY');

$payload  = file_get_contents('php://input');
$checksum = $_SERVER['HTTP_QUICKPAY_CHECKSUM_SHA256'] ?? '';

// Verificer signatur
$computed = hash_hmac('sha256', $payload, QP_PRIVATE_KEY);
if (!hash_equals($computed, $checksum)) {
    http_response_code(403);
    exit('Unauthorized');
}

$payment  = json_decode($payload, true);
$accepted = $payment['accepted'] ?? false;
$ordreNr  = $payment['order_id'] ?? '?';
$amount   = ($payment['link']['amount'] ?? 0) / 100;
$state    = $payment['state'] ?? '?';

// Log ordren til en fil (kan du se via one.com's filhåndtering)
$log = sprintf(
    "[%s] Ordre: %s | Beløb: %.2f kr. | Status: %s | Godkendt: %s\n",
    date('Y-m-d H:i:s'),
    $ordreNr,
    $amount,
    $state,
    $accepted ? 'JA' : 'NEJ'
);
file_put_contents(__DIR__ . '/orders.log', $log, FILE_APPEND | LOCK_EX);

http_response_code(200);
echo 'OK';
