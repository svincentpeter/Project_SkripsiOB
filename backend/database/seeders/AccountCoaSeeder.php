<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

class AccountCoaSeeder extends Seeder
{
    public function run(): void
    {
        // 1-1002, 2-1004 dan 4-2000 nonaktif sejak DP booking, BON dan surcharge EDC dihapus (jurnal lama tetap sah).
        $accounts = [
            ['account_code' => '1-1000', 'account_name' => 'Kas Toko Laci Kasir', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['account_code' => '1-1001', 'account_name' => 'Bank BCA Cabang 3', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['account_code' => '1-1002', 'account_name' => 'Piutang Dagang (AR)', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_active' => false],
            ['account_code' => '1-2000', 'account_name' => 'Persediaan Ban Baru Cabang 3', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['account_code' => '1-3000', 'account_name' => 'Peralatan Bengkel & Mesin Spooring', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['account_code' => '1-3999', 'account_name' => 'Akumulasi Penyusutan Mesin', 'account_type' => 'ASSET', 'normal_balance' => 'CREDIT'],
            ['account_code' => '2-1000', 'account_name' => 'Hutang Dagang Supplier (AP)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['account_code' => '2-1004', 'account_name' => 'Uang Muka Pelanggan (DP Booking)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_active' => false],
            ['account_code' => '3-1000', 'account_name' => 'Modal Disetor Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            ['account_code' => '3-2000', 'account_name' => 'Laba Ditahan Cabang 3', 'account_type' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            // Prive: ekuitas bersaldo normal debit (pengurang ekuitas), tidak ditutup saat tutup buku bulanan.
            ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT'],
            ['account_code' => '4-1000', 'account_name' => 'Pendapatan Penjualan Ban Baru', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
            ['account_code' => '4-1001', 'account_name' => 'Pendapatan Jasa Servis & Spooring', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
            ['account_code' => '4-2000', 'account_name' => 'Pendapatan Surcharge EDC', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT', 'is_active' => false],
            ['account_code' => '4-9000', 'account_name' => 'Potongan Diskon Penjualan', 'account_type' => 'REVENUE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '4-9100', 'account_name' => 'Retur Penjualan', 'account_type' => 'REVENUE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '5-1000', 'account_name' => 'Harga Pokok Penjualan (HPP) Ban Baru', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '5-2000', 'account_name' => 'Selisih Persediaan (Opname)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1000', 'account_name' => 'Beban Gaji & Uang Makan Karyawan', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1001', 'account_name' => 'Beban Listrik, Air & Internet', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1003', 'account_name' => 'Beban Sewa Bangunan Toko', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1004', 'account_name' => 'Beban Transportasi & Pengiriman Ban', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1005', 'account_name' => 'Beban Perlengkapan & ATK Toko', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1006', 'account_name' => 'Beban Perawatan Mesin Spooring & Balancing', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1007', 'account_name' => 'Beban Konsumsi & Lembur Karyawan', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1008', 'account_name' => 'Beban Pajak & Retribusi Daerah', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1009', 'account_name' => 'Beban MDR QRIS & EDC', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            // SP4 SAK EMKM: penyusutan, akrual/dibayar di muka, biaya & bunga bank.
            ['account_code' => '1-1100', 'account_name' => 'Beban Dibayar di Muka', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['account_code' => '2-1100', 'account_name' => 'Beban Yang Masih Harus Dibayar', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['account_code' => '4-3000', 'account_name' => 'Pendapatan Bunga Bank', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
            ['account_code' => '6-1011', 'account_name' => 'Beban Penyusutan Aset Tetap', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1012', 'account_name' => 'Beban Administrasi Bank', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
        ];

        // Hanya akun yang belum ada yang dibuat (idempoten, satu query cek).
        $existing = Account::pluck('account_code')->all();
        foreach ($accounts as $data) {
            if (! in_array($data['account_code'], $existing, true)) {
                Account::create($data);
            }
        }
    }
}
