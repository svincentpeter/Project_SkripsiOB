<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Menghapus QRIS Statis/Manual fisik dan melengkapi kanal Midtrans Payment Gateway
     * (QRIS Dinamis + Midtrans Snap sebagai pengganti mesin EDC fisik toko baru).
     */
    public function up(): void
    {
        // Hapus QRIS statis/manual fisik (toko menonjolkan Midtrans Payment Gateway sepenuhnya)
        DB::table('payment_provider_settings')
            ->where('method_type', 'qris')
            ->where(function ($q) {
                $q->where('provider_code', 'QRIS_BCA')
                    ->orWhere('provider_name', 'like', '%Statis%');
            })
            ->delete();

        $now = now();

        // Pastikan Midtrans QRIS Dinamis aktif
        $hasMidtransQris = DB::table('payment_provider_settings')
            ->where('method_type', 'qris')
            ->where('provider_code', 'MIDTRANS_QRIS')
            ->exists();

        if (! $hasMidtransQris) {
            DB::table('payment_provider_settings')->insert([
                'method_type' => 'qris',
                'provider_name' => 'Midtrans QRIS',
                'provider_code' => 'MIDTRANS_QRIS',
                'fee_percentage' => 0.70,
                'fee_threshold_amount' => 0,
                'is_active' => true,
                'sort_order' => 1,
                'notes' => 'QRIS Dinamis universal via Midtrans Core API (semua m-banking & e-wallet).',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Pastikan Midtrans Snap (Pengganti EDC: Kartu Kredit/Debit, VA, E-Wallet) aktif
        $hasMidtransSnap = DB::table('payment_provider_settings')
            ->where('method_type', 'qris')
            ->where('provider_code', 'MIDTRANS_SNAP')
            ->exists();

        if (! $hasMidtransSnap) {
            DB::table('payment_provider_settings')->insert([
                'method_type' => 'qris',
                'provider_name' => 'Midtrans Snap (Pengganti EDC)',
                'provider_code' => 'MIDTRANS_SNAP',
                'fee_percentage' => 2.90,
                'fee_threshold_amount' => 0,
                'is_active' => true,
                'sort_order' => 2,
                'notes' => 'Pengganti mesin EDC fisik — menerima Kartu Kredit/Debit (Visa/Mastercard), Virtual Account, E-Wallet, & QRIS via Midtrans Snap.',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        // Tidak mengembalikan standee QRIS statis.
    }
};
