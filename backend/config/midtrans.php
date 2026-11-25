<?php

$isProduction = (bool) env('MIDTRANS_IS_PRODUCTION', false);

return [
    // Tanpa kunci bawaan: kunci demo yang tertulis di repo membuat signature webhook bisa dipalsukan siapa saja.
    'server_key' => env('MIDTRANS_SERVER_KEY', ''),
    // Midtrans Access Keys memisahkan Signature Secret Key khusus verifikasi webhook (fallback ke server_key bila kosong).
    'signature_key' => env('MIDTRANS_SIGNATURE_KEY', '') ?: env('MIDTRANS_SERVER_KEY', ''),
    'client_key' => env('MIDTRANS_CLIENT_KEY', ''),
    'is_production' => $isProduction,
    'merchant_id' => env('MIDTRANS_MERCHANT_ID', ''),
    'api_url' => $isProduction
        ? 'https://api.midtrans.com'
        : 'https://api.sandbox.midtrans.com',
    'snap_url' => $isProduction
        ? 'https://app.midtrans.com'
        : 'https://app.sandbox.midtrans.com',
    'snap_js_url' => $isProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js',
    // Simulasi lunas dan QR cadangan hanya untuk demo sandbox; selalu mati di mode produksi.
    'allow_simulation' => ! $isProduction && (bool) env('MIDTRANS_ALLOW_SIMULATION', false),
];
