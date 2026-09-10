<?php

return [
    'server_key' => env('MIDTRANS_SERVER_KEY', 'SB-Mid-server-TEST_KEY_DEMO_OMAHBAN'),
    'client_key' => env('MIDTRANS_CLIENT_KEY', 'SB-Mid-client-TEST_KEY_DEMO_OMAHBAN'),
    'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
    'merchant_id' => env('MIDTRANS_MERCHANT_ID', ''),
    'api_url' => env('MIDTRANS_IS_PRODUCTION', false)
        ? 'https://api.midtrans.com'
        : 'https://api.sandbox.midtrans.com',
];
