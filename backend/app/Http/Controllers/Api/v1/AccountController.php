<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;

class AccountController extends Controller
{
    public function index(): JsonResponse
    {
        $accounts = Account::orderBy('account_code')->get();

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }
}
