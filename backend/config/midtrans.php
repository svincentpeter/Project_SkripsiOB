<?php

$isProduction = (bool) env('MIDTRANS_IS_PRODUCTION', false);

return [
    // Tanpa kunci bawaan: kunci demo yang tertulis di repo membuat signature webhook bisa dipalsukan siapa saja.
    'server_key' => env('MIDTRANS_SERVER_KEY', ''),
    'client_key' => env('MIDTRANS_CLIENT_KEY', ''),
    'is_production' => $isProduction,
    'merchant_id' => env('MIDTRANS_MERCHANT_ID', ''),
    'api_url' => $isProduction
        ? 'https://api.midtrans.com'
        : 'https://api.sandbox.midtrans.com',
    // Simulasi lunas dan QR cadangan hanya untuk demo sandbox; selalu mati di mode produksi.
    'allow_simulation' => ! $isProduction && (bool) env('MIDTRANS_ALLOW_SIMULATION', false),
];
