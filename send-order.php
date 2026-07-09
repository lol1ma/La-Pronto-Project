<?php
// smtp config
define('SMTP_HOST', 'send.one.com');
define('SMTP_PORT', 465);
define('SMTP_USER', 'orderprint@la-pronto.dk');
define('SMTP_PASS', 'YOUR_SMTP_PASSWORD');
define('SMTP_FROM', 'orderprint@la-pronto.dk');
define('SMTP_NAME', 'La Pronto Pizza');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false]);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['success' => false]);
    exit;
}

$ordreNr      = htmlspecialchars($body['ordreNr']      ?? '?');
$navn         = htmlspecialchars($body['navn']         ?? '?');
$telefon      = htmlspecialchars($body['telefon']      ?? '');
$email        = htmlspecialchars($body['email']        ?? '');
$leveringType = htmlspecialchars($body['leveringType'] ?? 'afhentning');
$adresse      = htmlspecialchars($body['adresse']      ?? '');
$kommentar    = htmlspecialchars($body['kommentar']    ?? '');
$tidspunkt    = htmlspecialchars($body['tidspunkt']    ?? 'Snarest muligt');
$betaling     = htmlspecialchars($body['betaling']     ?? '');
$items        = $body['items']   ?? [];
$subtotal     = number_format($body['subtotal']  ?? 0, 2, ',', '.');
$delivery     = number_format($body['delivery']  ?? 0, 2, ',', '.');
$discount     = number_format($body['discount']  ?? 0, 2, ',', '.');
$total        = number_format($body['total']     ?? 0, 2, ',', '.');

// smtp helper
function smtp_read($s) {
    $r = '';
    while (!feof($s)) { $l = fgets($s, 512); $r .= $l; if ($l[3] === ' ') break; }
    return $r;
}
function smtp_cmd($s, $c) { fwrite($s, $c . "\r\n"); return smtp_read($s); }

function send_smtp_email($to, $subject, $html) {
    $sock = stream_socket_client('ssl://' . SMTP_HOST . ':' . SMTP_PORT, $errno, $errstr, 15);
    if (!$sock) throw new Exception("Connect failed: $errstr");

    smtp_read($sock);
    smtp_cmd($sock, 'EHLO ' . SMTP_HOST);
    $auth = smtp_cmd($sock, 'AUTH LOGIN');
    smtp_cmd($sock, base64_encode(SMTP_USER));
    $pass = smtp_cmd($sock, base64_encode(SMTP_PASS));
    if (strpos($pass, '235') === false && strpos($pass, '334') === false && strpos($auth, '503') === false) {
        fclose($sock);
        throw new Exception("Auth failed: $pass");
    }
    smtp_cmd($sock, 'MAIL FROM:<' . SMTP_FROM . '>');
    $rcpt = smtp_cmd($sock, 'RCPT TO:<' . $to . '>');
    if (strpos($rcpt, '250') === false) {
        fclose($sock);
        throw new Exception("RCPT rejected for $to: $rcpt");
    }
    smtp_cmd($sock, 'DATA');

    $msg  = "From: " . SMTP_NAME . " <" . SMTP_FROM . ">\r\n";
    $msg .= "To: <$to>\r\n";
    $msg .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    $msg .= $html . "\r\n.";
    $res = smtp_cmd($sock, $msg);
    smtp_cmd($sock, 'QUIT');
    fclose($sock);
    if (strpos($res, '250') === false) throw new Exception("DATA rejected: $res");
    return true;
}

$leveringLabel = $leveringType === 'levering' ? 'Levering' : 'Afhentning';

// restaurant email
$restLinjer = '';
foreach ($items as $item) {
    $rawName  = $item['name'] ?? '';
    $baseName = $item['baseName'] ?? null;
    $size     = $item['size']     ?? null;
    $extrasArr= $item['extras']   ?? null;
    $qty      = intval($item['qty'] ?? 1);
    $pris     = number_format(($item['price'] ?? 0) * $qty, 2, ',', '.');

    if ($baseName !== null) {
        $mainName   = htmlspecialchars($baseName);
        $extraLines = '';
        if ($size) {
            $extraLines .= "<br><span style='font-size:24px;font-weight:800;color:#000;'>+ St&oslash;rrelse: " . htmlspecialchars($size) . "</span>";
        }
        foreach (($extrasArr ?: []) as $e) {
            $ePris = number_format($e['pris'] ?? 0, 2, ',', '.');
            $label = htmlspecialchars($e['kategori'] ?? 'Tilbeh&oslash;r');
            $label .= ($e['pris'] > 0) ? " ({$ePris} kr.)" : '';
            $extraLines .= "<br><span style='font-size:24px;font-weight:800;color:#000;'>+ {$label}: " . htmlspecialchars($e['navn'] ?? '') . "</span>";
        }
    } else {
        if (preg_match('/^(.+?)\s*\((.+)\)$/', $rawName, $m)) {
            $mainName   = htmlspecialchars($m[1]);
            $extraLines = "<br><span style='font-size:24px;font-weight:800;color:#000;'>+ Tilbeh&oslash;r: " . htmlspecialchars($m[2]) . "</span>";
        } else {
            $mainName   = htmlspecialchars($rawName);
            $extraLines = '';
        }
    }

    $restLinjer .= "
    <tr>
      <td style='padding:12px 20px;border-bottom:2px solid #000;font-size:22px;font-weight:900;color:#000;'>{$mainName}{$extraLines}</td>
      <td style='padding:12px 20px;border-bottom:2px solid #000;text-align:center;font-size:22px;font-weight:900;'>{$qty}</td>
      <td style='padding:12px 20px;border-bottom:2px solid #000;text-align:right;font-size:20px;font-weight:900;'>{$pris} kr.</td>
    </tr>";
}

$deliveryRaw  = $body['delivery'] ?? 0;
$subtotalRaw  = $body['subtotal'] ?? 0;
$subtotalFmt  = number_format($subtotalRaw, 2, ',', '.');
$deliveryFmt  = number_format($deliveryRaw, 2, ',', '.');
$momsRaw      = ($body['total'] ?? 0) / 1.25 * 0.25;
$momsFmt      = number_format($momsRaw, 2, ',', '.');
$daMåneder = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
$dato = date('j') . '. ' . $daMåneder[date('n') - 1] . ' ' . date('Y');

$htmlRestaurant = "
<!DOCTYPE html><html><head><meta charset='UTF-8'>
<style>
@page { size: A4 portrait; margin: 10mm; }
@media print {
  body { background: #fff !important; margin: 0 !important; }
  tr { page-break-inside: avoid; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>
</head>
<body style='font-family:Arial,sans-serif;max-width:720px;margin:0 auto;background:#f5f5f5;font-weight:800;color:#000;'>

  <!-- Header -->
  <div style='background:#000;padding:18px 24px;text-align:center;border-bottom:4px solid #000;'>
    <h1 style='margin:0;font-size:2rem;font-weight:900;color:#fff;letter-spacing:0.02em;'>Ordre #{$ordreNr} &mdash; Total {$total} kr. &mdash; {$dato}</h1>
  </div>

  <!-- Summary -->
  <div style='background:#fff;border:3px solid #000;border-top:none;'>
    <table style='width:100%;border-collapse:collapse;'>
      <tr>
        <td style='padding:16px 20px;vertical-align:top;font-size:17px;font-weight:800;color:#000;border-right:3px solid #000;width:30%;'>
          <div style='font-size:12px;font-weight:900;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;'>Beløb</div>
          Subtotal: {$subtotalFmt} kr." .
          ($deliveryRaw > 0 ? "<br>Levering: {$deliveryFmt} kr." : "") . "
          <br><strong>Total: {$total} kr.</strong>
        </td>
        <td style='padding:16px 20px;vertical-align:top;border-right:3px solid #000;width:40%;font-size:17px;font-weight:800;color:#000;'>
          <div style='font-size:12px;font-weight:900;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;'>Forsendelse</div>
          <span style='font-size:42px;font-weight:900;color:#000;'>{$leveringLabel}</span>" .
          ($leveringType === 'levering' && $adresse ? "<br><span style='font-size:22px;font-weight:900;'>{$adresse}</span>" : "") . "
        </td>
        <td style='padding:16px 20px;vertical-align:top;width:30%;font-size:17px;font-weight:800;color:#000;'>
          <div style='font-size:12px;font-weight:900;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;'>F&aelig;rdig</div>
          <span style='font-size:26px;font-weight:900;color:#000;'>{$tidspunkt}</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Produkter -->
  <div style='background:#fff;margin-top:6px;border:3px solid #000;'>
    <div style='padding:8px 20px;border-bottom:2px solid #000;'>
      <span style='font-size:13px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:0.1em;'>Bestilte produkter</span>
    </div>
    <table style='width:100%;border-collapse:collapse;'>
      <thead>
        <tr style='border-bottom:3px solid #000;'>
          <th style='padding:10px 20px;text-align:left;font-size:16px;font-weight:900;color:#000;'>Produkt</th>
          <th style='padding:10px 20px;text-align:center;font-size:16px;font-weight:900;color:#000;width:60px;'>Stk</th>
          <th style='padding:10px 20px;text-align:right;font-size:16px;font-weight:900;color:#000;width:90px;'>Pris</th>
        </tr>
      </thead>
      <tbody>
        {$restLinjer}
      </tbody>
    </table>
  </div>" .

  ($kommentar ? "
  <!-- Kundenote -->
  <div style='background:#fff;margin-top:6px;border:3px solid #000;'>
    <div style='padding:8px 20px;border-bottom:2px solid #000;'>
      <span style='font-size:13px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:0.1em;'>Kundenote</span>
    </div>
    <div style='padding:14px 20px;font-size:18px;font-weight:900;color:#000;'>
      {$kommentar}
    </div>
  </div>" : "") . "

  <!-- Kunde + Adresse -->
  <div style='background:#fff;margin-top:6px;border:3px solid #000;'>
    <table style='width:100%;border-collapse:collapse;'>
      <tr>
        <td style='padding:16px 20px;vertical-align:top;border-right:3px solid #000;width:50%;'>
          <div style='font-size:12px;font-weight:900;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;border-bottom:2px solid #000;padding-bottom:4px;'>Kunde</div>
          <table style='font-size:17px;font-weight:800;color:#000;line-height:2;border-collapse:collapse;width:100%;'>
            <tr><td style='font-weight:900;padding-right:12px;width:50px;'>Navn:</td><td style='font-weight:800;'>{$navn}</td></tr>
            <tr><td style='font-weight:900;padding-right:12px;'>Tlf:</td><td style='font-weight:800;'>{$telefon}</td></tr>
          </table>
        </td>
        <td style='padding:16px 20px;vertical-align:top;width:50%;'>" .
        ($leveringType === 'levering' && $adresse ? "
          <div style='font-size:12px;font-weight:900;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;border-bottom:2px solid #000;padding-bottom:4px;'>Leveringsadresse</div>
          <span style='font-size:26px;font-weight:900;color:#000;line-height:1.5;'>{$adresse}</span>" : "
          <div style='font-size:12px;font-weight:900;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;border-bottom:2px solid #000;padding-bottom:4px;'>Afhentning</div>
          <span style='font-size:18px;font-weight:800;color:#000;'>Lemvigvej 97, 9220 Aalborg &Oslash;st</span>") . "
        </td>
      </tr>
    </table>
  </div>

</body></html>";

// customer receipt email
$totalRaw      = $body['total'] ?? 0;
$subtotal_moms = number_format($totalRaw / 1.25 * 0.25, 2, ',', '.');
$tidspunktVis  = $tidspunkt === 'Snarest muligt' ? 'snarest muligt' : 'kl. ' . $tidspunkt;

$kundeLinjer = '';
foreach ($items as $item) {
    $rawName  = $item['name'] ?? '';
    $baseName = $item['baseName'] ?? null;
    $size     = $item['size']     ?? null;
    $extrasArr= $item['extras']   ?? null;
    $qty      = intval($item['qty'] ?? 1);
    $pris     = number_format(($item['price'] ?? 0) * $qty, 2, ',', '.');

    if ($baseName !== null) {
        $displayName = htmlspecialchars($baseName);
        $extraLines  = '';
        if ($size) {
            $extraLines .= "<br><span style='font-size:0.82em;color:#777;'>St&oslash;rrelse: " . htmlspecialchars($size) . "</span>";
        }
        foreach (($extrasArr ?: []) as $e) {
            $ePris = number_format($e['pris'] ?? 0, 2, ',', '.');
            $label = htmlspecialchars($e['kategori'] ?? 'Tilbeh&oslash;r');
            $label .= ($e['pris'] > 0) ? " ({$ePris} kr.)" : '';
            $extraLines .= "<br><span style='font-size:0.82em;color:#777;'>{$label}: " . htmlspecialchars($e['navn'] ?? '') . "</span>";
        }
    } else {
        if (preg_match('/^(.+?)\s*\((.+)\)$/', $rawName, $m)) {
            $displayName = htmlspecialchars($m[1]);
            $extraLines  = "<br><span style='font-size:0.82em;color:#777;'>Tilbeh&oslash;r: " . htmlspecialchars($m[2]) . "</span>";
        } else {
            $displayName = htmlspecialchars($rawName);
            $extraLines  = '';
        }
    }

    $kundeLinjer .= "<tr>
      <td style='padding:7px 0;border-bottom:1px solid #eee;'>{$displayName}{$extraLines}" . ($qty > 1 ? " <span style='color:#888;font-size:0.85em;'>x{$qty}</span>" : "") . "</td>
      <td style='padding:7px 0;border-bottom:1px solid #eee;text-align:right;color:#333;'>{$pris} kr.</td>
    </tr>";
}
if (($body['delivery'] ?? 0) > 0) {
    $kundeLinjer .= "<tr>
      <td style='padding:7px 0;border-bottom:1px solid #eee;color:#555;'>Levering</td>
      <td style='padding:7px 0;border-bottom:1px solid #eee;text-align:right;color:#555;'>" . number_format($body['delivery'] ?? 0, 2, ',', '.') . " kr.</td>
    </tr>";
}

$leveringDetalje = $leveringType === 'levering'
    ? "Vi leverer til <strong>{$adresse}</strong>."
    : "Hent maden hos os: <strong>Lemvigvej 97, 9220 Aalborg</strong>.";

$htmlKunde = "
<!DOCTYPE html><html><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;max-width:540px;margin:0 auto;background:#F7F3EF;'>

  <!-- Header -->
  <div style='background:#2E163F;padding:28px 32px 24px;'>
    <p style='margin:0 0 6px;font-size:0.75rem;color:#d9b152;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;'>La Pronto Pizza</p>
    <h1 style='margin:0 0 6px;font-size:1.5rem;font-weight:800;color:#ffffff;'>&#127829; Hej {$navn}! &mdash; Ordre #{$ordreNr}</h1>
    <p style='margin:0 0 8px;font-size:1rem;color:#ffffff;font-weight:700;line-height:1.5;'>Tak for din bestilling, din ordre er nu modtaget.</p>
    <p style='margin:0;font-size:0.92rem;color:#c8b8d8;line-height:1.5;'>Vi er allerede i gang — maden er snart klar.</p>
  </div>

  <!-- Info-boks -->
  <div style='background:#ffffff;border-left:4px solid #d9b152;margin:0;padding:16px 32px;font-size:0.87rem;color:#333;'>
    <table style='width:100%;border-collapse:collapse;'>
      <tr>
        <td style='padding:4px 0;color:#777;width:130px;'>Ordre</td>
        <td style='padding:4px 0;font-weight:700;color:#2E163F;'>{$ordreNr}</td>
      </tr>
      <tr>
        <td style='padding:4px 0;color:#777;'>Maden klar</td>
        <td style='padding:4px 0;font-weight:700;color:#2E163F;'>{$tidspunktVis}</td>
      </tr>
      <tr>
        <td style='padding:4px 0;color:#777;'>Forsendelse</td>
        <td style='padding:4px 0;font-weight:700;color:#2E163F;'>{$leveringLabel}" . ($leveringType === 'levering' && $adresse ? "<br><span style='font-weight:400;color:#555;font-size:0.85em;'>{$adresse}</span>" : "") . "</td>
      </tr>
    </table>
  </div>

  <!-- Ordrelinjer -->
  <div style='background:#ffffff;margin-top:2px;padding:20px 32px;'>
    <table style='width:100%;border-collapse:collapse;font-size:0.9rem;'>
      {$kundeLinjer}
      <tr style='border-top:2px solid #2E163F;'>
        <td style='padding:10px 0 2px;font-weight:800;color:#2E163F;font-size:1rem;'>I alt</td>
        <td style='padding:10px 0 2px;text-align:right;font-weight:800;color:#2E163F;font-size:1rem;'>{$total} kr.</td>
      </tr>
      <tr>
        <td colspan='2' style='padding:0;font-size:0.75rem;color:#999;text-align:right;'>inkl. {$subtotal_moms} kr. moms</td>
      </tr>
    </table>
  </div>

  <!-- Leveringsinfo -->
  <div style='background:#f3eef8;margin-top:2px;padding:16px 32px;font-size:0.87rem;color:#4B246B;line-height:1.7;border-left:4px solid #4B246B;'>
    {$leveringDetalje}<br>
    Spørgsmål? Ring til os: <strong>98 15 46 40</strong>
  </div>" .

  ($kommentar ? "
  <!-- Bemærkning -->
  <div style='background:#ffffff;margin-top:2px;padding:14px 32px;font-size:0.87rem;border-left:4px solid #d9b152;'>
    <p style='margin:0 0 4px;font-size:0.72rem;color:#999;text-transform:uppercase;letter-spacing:0.06em;'>Din bemærkning</p>
    <p style='margin:0;color:#2E163F;font-weight:600;'>{$kommentar}</p>
  </div>" : "") . "

  <!-- Footer -->
  <div style='padding:16px 32px;font-size:0.75rem;color:#aaa;text-align:center;'>
    La Pronto Pizza &middot; Lemvigvej 97, 9220 Aalborg &Oslash;st &middot; la-pronto.dk
  </div>

</body></html>";

// send
$sent  = false;
$error      = '';
$sentRestaurant = false;
$sentKunde      = false;

try {
    $sentRestaurant = send_smtp_email('no-reply@la-pronto.dk', "Ny ordre #{$ordreNr} — {$navn} ({$leveringLabel})", $htmlRestaurant);
} catch (Exception $e) {
    $error .= 'Restaurant: ' . $e->getMessage() . ' ';
}

if ($email) {
    usleep(300000); // 0.3s pause mellem de to SMTP-forbindelser
    try {
        $sentKunde = send_smtp_email($email, "Ordrebekræftelse #{$ordreNr} — La Pronto Pizza", $htmlKunde);
    } catch (Exception $e) {
        $error .= 'Kunde: ' . $e->getMessage() . ' ';
    }
}

$logLine = sprintf("[%s] Ordre:%s | Restaurant:%s | KundeMail:%s | KundeSent:%s | Kommentar:%s | %s\n",
    date('Y-m-d H:i:s'),
    $ordreNr,
    $sentRestaurant ? 'JA' : 'NEJ',
    $email ?: 'ingen',
    $sentKunde  ? 'JA' : 'NEJ',
    $kommentar  ?: '(ingen)',
    $error ?: 'OK'
);
file_put_contents(__DIR__ . '/mail-debug.txt', $logLine, FILE_APPEND | LOCK_EX);

echo json_encode(['success' => $sentRestaurant, 'error' => $error]);
