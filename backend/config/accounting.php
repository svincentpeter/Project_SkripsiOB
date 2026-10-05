<?php

return [
    // Tolak jurnal yang membuat saldo kas laci / bank (AccountingEngine::NON_NEGATIVE_ACCOUNTS) negatif.
    // Dimatikan di phpunit.xml karena fixture tes lama membayar tanpa saldo awal; tes NonNegativeCashTest menyalakannya.
    'guard_negative_cash' => (bool) env('ACCOUNTING_GUARD_NEGATIVE_CASH', true),
];
