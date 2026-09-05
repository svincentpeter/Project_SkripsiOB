<?php

namespace App\Exceptions;

use Exception;

class AccountingUnbalancedException extends Exception
{
    public function __construct(float $debit, float $credit, string $message = "")
    {
        $diff = abs($debit - $credit);
        $msg = $message ?: "Ayat jurnal tidak seimbang! Total Debit (Rp " . number_format($debit, 2) . ") != Total Kredit (Rp " . number_format($credit, 2) . "), Selisih: Rp " . number_format($diff, 2);
        parent::__construct($msg, 422);
    }
}
