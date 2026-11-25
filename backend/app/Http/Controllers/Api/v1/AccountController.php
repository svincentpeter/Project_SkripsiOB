<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manajemen Daftar Akun (Chart of Accounts / COA) sesuai struktur SAK EMKM.
 * Akun inti sistem tetap terlindungi dari penghapusan / penonaktifan agar posting otomatis POS,
 * FIFO, aset tetap, rekonsiliasi bank, dan tutup buku tetap konsisten.
 */
class AccountController extends Controller
{
    /**
     * Kode akun inti yang dipakai langsung oleh layanan otomatis (POS, FIFO, Kas/Bank, Aset Tetap, Tutup Buku).
     */
    public const SYSTEM_ACCOUNT_CODES = [
        '1-1000', '1-1001', '1-1100', '1-2000', '1-3000', '1-3999',
        '2-1000', '2-1100',
        '3-1000', '3-2000', '3-3000',
        '4-1000', '4-1001', '4-3000', '4-9000', '4-9100',
        '5-1000', '5-2000',
        '6-1009', '6-1010', '6-1011', '6-1012',
    ];

    public function index(): JsonResponse
    {
        $accounts = Account::withCount('journalItems')
            ->orderBy('account_code')
            ->get()
            ->map(fn (Account $a) => self::formatAccount($a))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_code' => [
                'required',
                'string',
                'max:20',
                'regex:/^[1-6]-\d{4}$/',
                'unique:accounts,account_code',
            ],
            'account_name' => 'required|string|max:150',
            'account_type' => ['required', Rule::in(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])],
            'normal_balance' => ['required', Rule::in(['DEBIT', 'CREDIT'])],
            'is_active' => 'nullable|boolean',
        ], [
            'account_code.regex' => 'Format kode akun harus seperti 1-1010 atau 6-1020 (awalan 1–6 diikuti tanda hubung dan 4 digit angka).',
            'account_code.unique' => 'Kode akun tersebut sudah digunakan.',
        ]);

        if ($mismatch = self::validateCodePrefix($validated['account_code'], $validated['account_type'])) {
            return response()->json(['success' => false, 'message' => $mismatch], 422);
        }

        $account = Account::create([
            'account_code' => trim($validated['account_code']),
            'account_name' => trim($validated['account_name']),
            'account_type' => $validated['account_type'],
            'normal_balance' => $validated['normal_balance'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);
        $account->loadCount('journalItems');

        return response()->json([
            'success' => true,
            'message' => "Akun {$account->account_code} — {$account->account_name} berhasil ditambahkan.",
            'data' => self::formatAccount($account),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = Account::withCount('journalItems')->findOrFail($id);
        $isSystem = self::isSystemAccount($account->account_code);
        $hasJournals = (int) $account->journal_items_count > 0;

        $validated = $request->validate([
            'account_code' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                'regex:/^[1-6]-\d{4}$/',
                Rule::unique('accounts', 'account_code')->ignore($account->id),
            ],
            'account_name' => 'sometimes|required|string|max:150',
            'account_type' => ['sometimes', 'required', Rule::in(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])],
            'normal_balance' => ['sometimes', 'required', Rule::in(['DEBIT', 'CREDIT'])],
            'is_active' => 'sometimes|boolean',
        ], [
            'account_code.regex' => 'Format kode akun harus seperti 1-1010 atau 6-1020.',
            'account_code.unique' => 'Kode akun tersebut sudah digunakan.',
        ]);

        $nextCode = trim((string) ($validated['account_code'] ?? $account->account_code));
        $nextType = (string) ($validated['account_type'] ?? $account->account_type);
        $nextNormal = (string) ($validated['normal_balance'] ?? $account->normal_balance);
        $nextActive = array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : (bool) $account->is_active;

        $structuralChanged = $nextCode !== $account->account_code
            || $nextType !== $account->account_type
            || $nextNormal !== $account->normal_balance;

        if ($isSystem && ($structuralChanged || ! $nextActive)) {
            return response()->json([
                'success' => false,
                'message' => "Akun inti sistem ({$account->account_code}) tidak dapat dinonaktifkan atau diubah kode/jenis/saldo normalnya. Anda tetap dapat mengubah nama akun.",
            ], 422);
        }

        if ($hasJournals && $structuralChanged) {
            return response()->json([
                'success' => false,
                'message' => "Akun {$account->account_code} sudah memiliki {$account->journal_items_count} baris jurnal sehingga kode, jenis, dan saldo normalnya tidak dapat diubah.",
            ], 422);
        }

        if ($mismatch = self::validateCodePrefix($nextCode, $nextType)) {
            return response()->json(['success' => false, 'message' => $mismatch], 422);
        }

        $account->update([
            'account_code' => $nextCode,
            'account_name' => trim((string) ($validated['account_name'] ?? $account->account_name)),
            'account_type' => $nextType,
            'normal_balance' => $nextNormal,
            'is_active' => $nextActive,
        ]);
        $account->loadCount('journalItems');

        return response()->json([
            'success' => true,
            'message' => "Akun {$account->account_code} berhasil diperbarui.",
            'data' => self::formatAccount($account),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $account = Account::withCount('journalItems')->findOrFail($id);

        if (self::isSystemAccount($account->account_code)) {
            return response()->json([
                'success' => false,
                'message' => "Akun inti sistem ({$account->account_code}) tidak dapat dihapus.",
            ], 422);
        }

        if ((int) $account->journal_items_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Akun {$account->account_code} sudah dipakai pada {$account->journal_items_count} baris jurnal. Nonaktifkan akun alih-alih menghapusnya.",
            ], 422);
        }

        $code = $account->account_code;
        $account->delete();

        return response()->json([
            'success' => true,
            'message' => "Akun {$code} berhasil dihapus.",
            'data' => ['deleted' => true],
        ]);
    }

    private static function isSystemAccount(string $code): bool
    {
        return in_array($code, self::SYSTEM_ACCOUNT_CODES, true);
    }

    private static function validateCodePrefix(string $code, string $type): ?string
    {
        $prefix = substr($code, 0, 2);
        $valid = match ($type) {
            'ASSET' => $prefix === '1-',
            'LIABILITY' => $prefix === '2-',
            'EQUITY' => $prefix === '3-',
            'REVENUE' => $prefix === '4-',
            'EXPENSE' => in_array($prefix, ['5-', '6-'], true),
            default => false,
        };

        if ($valid) {
            return null;
        }

        $expected = match ($type) {
            'ASSET' => '1-xxxx (Aset)',
            'LIABILITY' => '2-xxxx (Kewajiban)',
            'EQUITY' => '3-xxxx (Ekuitas)',
            'REVENUE' => '4-xxxx (Pendapatan)',
            'EXPENSE' => '5-xxxx (HPP) atau 6-xxxx (Beban)',
            default => '',
        };

        return "Kode akun {$code} tidak sesuai dengan jenis akun {$type}. Gunakan awalan {$expected}.";
    }

    private static function formatAccount(Account $account): array
    {
        return [
            'id' => $account->id,
            'account_code' => $account->account_code,
            'account_name' => $account->account_name,
            'account_type' => $account->account_type,
            'normal_balance' => $account->normal_balance,
            'is_active' => (bool) $account->is_active,
            'journal_items_count' => (int) ($account->journal_items_count ?? 0),
            'is_system' => self::isSystemAccount($account->account_code),
        ];
    }
}
