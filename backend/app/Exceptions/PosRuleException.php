<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Pelanggaran aturan bisnis POS (stok kurang, pembayaran tidak cocok, status tidak valid).
 */
class PosRuleException extends Exception
{
    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
