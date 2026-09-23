<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RolePermissionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(RolePermission::configMatrix());
    }

    /**
     * Hanya peran Kasir & Gudang yang dapat diubah; izin Owner tidak bisa dikurangi.
     */
    public function update(Request $request): JsonResponse
    {
        $input = $request->only(Permissions::CONFIGURABLE_ROLES);

        foreach ($input as $role => $flags) {
            if (! is_array($flags)) {
                throw ValidationException::withMessages([$role => 'Format izin tidak valid.']);
            }
            $unknown = array_diff(array_keys($flags), Permissions::KEYS);
            if ($unknown) {
                throw ValidationException::withMessages([$role => 'Kunci izin tidak dikenal: '.implode(', ', $unknown)]);
            }
        }

        DB::transaction(function () use ($input) {
            foreach ($input as $role => $flags) {
                foreach ($flags as $key => $allowed) {
                    RolePermission::updateOrCreate(
                        ['role' => $role, 'permission_key' => $key],
                        ['allowed' => (bool) $allowed]
                    );
                }
            }
        });

        return response()->json(RolePermission::configMatrix());
    }
}
