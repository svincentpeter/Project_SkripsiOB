<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payment_provider_settings')) {
            return;
        }

        $now = now();

        // 1. Hapus duplikat BCA pada Transfer Bank (sisakan satu baris 'BCA' yang bersih).
        $hasBca = DB::table('payment_provider_settings')
            ->where('method_type', 'bank')
            ->where('provider_name', 'BCA')
            ->exists();

        if ($hasBca) {
            DB::table('payment_provider_settings')
                ->where('method_type', 'bank')
                ->where('provider_code', 'TF_BCA')
                ->delete();
        } else {
            DB::table('payment_provider_settings')
                ->where('method_type', 'bank')
                ->where('provider_code', 'TF_BCA')
                ->update([
                    'provider_name' => 'BCA',
                    'provider_code' => 'BCA',
                    'sort_order' => 1,
                    'notes' => 'Rekening Utama Operasional',
                    'updated_at' => $now,
                ]);
        }

        // 2. Hapus daftar e-wallet/bank konsumen yang keliru pada QRIS (Midtrans adalah Payment Gateway tunggal).
        DB::table('payment_provider_settings')
            ->where('method_type', 'qris')
            ->whereIn('provider_code', ['BCA', 'MDR', 'GOPAY', 'OVO', 'DANA'])
            ->delete();

        // 3. Pastikan kanal QRIS resmi toko rapi: Midtrans QRIS (Dinamis) & QRIS BCA (Statis).
        DB::table('payment_provider_settings')->updateOrInsert(
            ['method_type' => 'qris', 'provider_name' => 'Midtrans QRIS'],
            [
                'provider_code' => 'MIDTRANS_QRIS',
                'fee_percentage' => 0.70,
                'fee_threshold_amount' => 0.00,
                'is_active' => true,
                'sort_order' => 1,
                'notes' => 'Payment Gateway Midtrans QRIS Dinamis (MDR 0,7% semua bank & e-wallet)',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('payment_provider_settings')->updateOrInsert(
            ['method_type' => 'qris', 'provider_name' => 'QRIS BCA (Statis)'],
            [
                'provider_code' => 'QRIS_BCA',
                'fee_percentage' => 0.70,
                'fee_threshold_amount' => 0.00,
                'is_active' => true,
                'sort_order' => 2,
                'notes' => 'Standee QRIS Statis toko (MDR 0,7%)',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    public function down(): void
    {
        // Pembersihan data tidak perlu dikembalikan ke data duplikat lama.
    }
};
