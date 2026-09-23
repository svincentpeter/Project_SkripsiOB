<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('inventory:opening-balance', function (\App\Services\Inventory\InventoryValueJournal $journal) {
    $before = \App\Services\Inventory\InventoryValueJournal::summary();
    $this->line('Nilai FIFO    : Rp '.number_format($before['fifo_value'], 2, ',', '.'));
    $this->line('Saldo 1-2000  : Rp '.number_format($before['ledger_balance'], 2, ',', '.'));

    $entry = $journal->postOpeningBalance();
    $entry
        ? $this->info("Jurnal saldo awal {$entry->entry_number} dibukukan (selisih Rp ".number_format($before['difference'], 2, ',', '.').').')
        : $this->info('Saldo buku persediaan sudah sama dengan nilai FIFO; tidak ada jurnal.');
})->purpose('Bukukan saldo awal persediaan agar akun 1-2000 sama dengan nilai stok FIFO');
