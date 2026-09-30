<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kas & bank (sub-proyek 2): tabel shift kasir (satu laci = akun 1-1000), akun Prive 3-3000 dan
 * Selisih Kas Kasir 6-1010, serta izin cash_session / cash_session_approve / cash_movement.
 * Aditif: akun dan izin hanya disisipkan bila belum ada.
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT'],
        ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
    ];

    /** Kasir membuka/menutup shift; persetujuan shift dan mutasi kas pemilik hanya Owner. */
    private const PERMISSIONS = [
        'cash_session' => ['KASIR' => true, 'GUDANG' => false],
        'cash_session_approve' => ['KASIR' => false, 'GUDANG' => false],
        'cash_movement' => ['KASIR' => false, 'GUDANG' => false],
    ];

    public function up(): void
    {
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamp('opened_at');
            $table->decimal('opening_float', 15, 2);
            $table->decimal('book_opening', 15, 2);
            $table->string('opening_note', 255)->nullable();
            // Jendela shift: jurnal dengan id > from_entry_id dan <= to_entry_id.
            $table->unsignedBigInteger('from_entry_id')->default(0);
            $table->unsignedBigInteger('to_entry_id')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users');
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('counted_cash', 15, 2)->nullable();
            $table->decimal('variance', 15, 2)->nullable();
            $table->string('variance_reason', 255)->nullable();
            $table->string('status', 20)->default('OPEN')->index();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries');
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });

        $existing = DB::table('accounts')->pluck('account_code')->all();
        foreach (self::ACCOUNTS as $account) {
            if (! in_array($account['account_code'], $existing, true)) {
                DB::table('accounts')->insert($account + ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        foreach (self::PERMISSIONS as $key => $defaults) {
            foreach ($defaults as $role => $allowed) {
                $exists = DB::table('role_permissions')->where('role', $role)->where('permission_key', $key)->exists();
                if (! $exists) {
                    DB::table('role_permissions')->insert([
                        'role' => $role,
                        'permission_key' => $key,
                        'allowed' => $allowed,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_sessions');
        DB::table('role_permissions')->whereIn('permission_key', array_keys(self::PERMISSIONS))->delete();
        // Akun yang sudah dipakai jurnal tidak boleh dihapus; hanya hapus yang belum pernah dipakai.
        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
