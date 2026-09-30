<?php

namespace App\Services\Accounting;

use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Mutasi kas oleh pemilik, masing-masing satu jurnal bernomor KAS-YYYYMM-####:
 * setor kas laci ke bank (1-1000 → 1-1001), prive (Dr 3-3000) dan setoran modal (Cr 3-1000).
 * Koreksi lewat jurnal penyesuaian manual (akun-akun ini bukan akun kontrol).
 */
class CashMovementService
{
    /** Jenis mutasi → reference_type jurnal. */
    public const TYPES = [
        'DEPOSIT' => 'CASH_DEPOSIT',
        'DRAWING' => 'OWNER_DRAWING',
        'CAPITAL' => 'CAPITAL_INJECTION',
    ];

    public const CASH = '1-1000';

    public const BANK = '1-1001';

    public const DRAWINGS = '3-3000';

    public const CAPITAL = '3-1000';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{type: string, date: string, amount: float|int|string, account_code?: ?string, description: string}  $data
     */
    public function create(array $data): JournalEntry
    {
        return DB::transaction(function () use ($data) {
            $amount = round((float) $data['amount'], 2);
            $account = $data['account_code'] ?? self::CASH;
            $draft = new JournalDraft();

            match ($data['type']) {
                'DEPOSIT' => $draft->debit(self::BANK, $amount, 'Setoran dari kas laci')->credit(self::CASH, $amount, 'Kas laci disetor ke bank'),
                'DRAWING' => $draft->debit(self::DRAWINGS, $amount, 'Prive pemilik')->credit($account, $amount, 'Diambil pemilik'),
                'CAPITAL' => $draft->debit($account, $amount, 'Setoran modal pemilik')->credit(self::CAPITAL, $amount, 'Tambahan modal disetor'),
            };

            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', 'KAS', $data['date']);

            return $draft->post($this->engine, self::TYPES[$data['type']], $reference, $data['description'], $data['date']);
        });
    }
}
