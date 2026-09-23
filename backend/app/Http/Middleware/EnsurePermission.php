<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lolos bila pengguna memiliki salah satu kunci izin yang disebut.
 * Pemakaian: ->middleware('permission:pos,inventory_view')
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$keys): Response
    {
        $user = $request->user();

        foreach ($keys as $key) {
            if ($user?->hasPermission($key)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Anda tidak memiliki izin untuk aksi ini.'], 403);
    }
}
