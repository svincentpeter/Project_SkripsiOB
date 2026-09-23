<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PosCheckoutRequest;
use App\Models\SalesBooking;
use App\Services\Pos\BookingService;
use App\Services\Pos\PosAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bookings = SalesBooking::query()
            ->when($request->input('status', 'ACTIVE') !== 'ALL', fn ($q) => $q->where('status', $request->input('status', 'ACTIVE')))
            ->orderBy('id', 'desc')
            ->limit(200)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(fn (SalesBooking $b) => $b->toApiArray())->values(),
        ]);
    }

    public function store(Request $request, BookingService $bookings): JsonResponse
    {
        // Nomor HP wajib: toko menghubungi pelanggan saat barang inden datang.
        $data = $request->validate([
            'customer_name' => 'required|string|max:100',
            'customer_phone' => 'required|string|max:30',
        ] + PosCheckoutRequest::cartRules() + [
            'dp_amount' => 'required|numeric|min:1',
            'payment_method' => ['required', Rule::in(PosAccounts::DEPOSIT_METHODS)],
        ]);

        $booking = $bookings->create($data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Booking {$booking->booking_number} tersimpan.",
            'data' => $booking->toApiArray(),
        ], 201);
    }

    public function cancel(Request $request, int $id, BookingService $bookings): JsonResponse
    {
        $data = $request->validate([
            'refund_account_code' => ['required', Rule::in([PosAccounts::CASH, PosAccounts::BANK])],
            'reason' => 'nullable|string|max:255',
        ]);

        $booking = $bookings->cancel($id, $data, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Booking {$booking->booking_number} dibatalkan dan DP dikembalikan.",
            'data' => $booking->toApiArray(),
        ]);
    }
}
