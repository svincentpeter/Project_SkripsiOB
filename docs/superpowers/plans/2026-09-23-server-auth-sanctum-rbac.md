# Autentikasi Server (Sanctum) & RBAC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login sungguhan via Laravel Sanctum (Bearer token) dan penegakan hak akses per peran di seluruh API `/api/v1`, dengan frontend yang memakai sesi server.

**Architecture:** Backend: Sanctum personal access token (12 jam), kolom peran di `users`, tabel `role_permissions`, satu aturan izin di `User::hasPermission`, middleware `permission:<keys>` per kelompok route. Frontend: `apiClient` menyisipkan token dan menangani 401 terpusat; `App.tsx` memulihkan sesi via `/auth/me`; semua jalur login palsu dihapus.

**Tech Stack:** Laravel 13, PHP 8.3, laravel/sanctum ^4, MySQL, PHPUnit 12; React 19, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-server-auth-sanctum-rbac-design.md`

## Global Constraints

- Peran: `OWNER`, `KASIR`, `GUDANG`. OWNER selalu punya semua izin; selain itu deny-by-default.
- 14 kunci izin: `dashboard, pos, receipt, booking_dp, bon_receivable, inventory_view, inventory_manage, goods_receipt, stock_opname, expenses, accounts_payable, accounting_hub, financial_reports, role_settings`.
- Token Bearer, masa berlaku 720 menit; kunci localStorage frontend `ob3_auth_token`.
- Login gagal/nonaktif → 422 `"Username atau password salah."`; throttle 5/menit.
- 403 message: `"Anda tidak memiliki izin untuk aksi ini."`
- Publik hanya: `GET /api/v1/health`, `POST /api/v1/auth/login`, `POST /api/v1/payment/midtrans/webhook`.
- `branch_name` = `Cabang 3 Magelang`.
- Test backend memakai DB `project-skripsi_ob_testing` (phpunit.xml). Jangan commit perubahan milik user di `backend/phpunit.xml`, `backend/database/seeders/OmahBanBanBaruSeeder.php`, `backend/database/seeders/data/`; di `DatabaseSeeder.php` commit hanya hunk milik tugas ini.
- Commit diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Baseline test yang deterministik

Masalah: test `RefreshDatabase` menjalankan `migrate:fresh` sehingga seed COA hilang dan test lain gagal 404 tergantung urutan.

**Files:**
- Create: `backend/database/seeders/TestBaselineSeeder.php`
- Modify: `backend/tests/TestCase.php`

- [ ] **Step 1: Buktikan kegagalan** — `cd backend && php artisan test` → 6 gagal 404 (ExpenseApiTest, InventoryRestockTest, PaymentMethodSettingsParityTest x2, PosTransactionTest).
- [ ] **Step 2: Seeder baseline idempoten**

```php
<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

/**
 * Data minimum yang diasumsikan test fitur: bagan akun SAK EMKM.
 */
class TestBaselineSeeder extends Seeder
{
    public function run(): void
    {
        if (Account::count() === 0) {
            $this->call(AccountCoaSeeder::class);
        }
    }
}
```

- [ ] **Step 3: TestCase menyiapkan baseline setiap test**

```php
<?php

namespace Tests;

use Database\Seeders\TestBaselineSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TestBaselineSeeder::class);
    }
}
```

- [ ] **Step 4:** `php artisan test` → 57 lulus. Jalankan dua kali berturut-turut; keduanya hijau.
- [ ] **Step 5: Commit** `test: seed COA baseline so feature tests do not depend on run order`

---

### Task 2: Sanctum, skema peran & aturan izin

**Files:**
- Composer: `laravel/sanctum`
- Create: `backend/config/sanctum.php` (publish), migrasi `personal_access_tokens` (publish)
- Create: `backend/database/migrations/2026_09_23_000001_add_role_columns_to_users_table.php`
- Create: `backend/database/migrations/2026_09_23_000002_create_role_permissions_table.php`
- Create: `backend/app/Models/RolePermission.php`
- Create: `backend/app/Support/Permissions.php`
- Modify: `backend/app/Models/User.php`
- Create: `backend/database/seeders/RolePermissionSeeder.php`, `backend/database/seeders/UserSeeder.php`
- Modify: `backend/database/seeders/TestBaselineSeeder.php`, `backend/database/seeders/DatabaseSeeder.php` (hanya blok "Default Users"), `backend/.env.example`
- Test: `backend/tests/Unit/UserPermissionTest.php`

**Interfaces — Produces:**
- `App\Support\Permissions::KEYS` (array 14 string), `Permissions::ROLES = ['OWNER','KASIR','GUDANG']`, `Permissions::CONFIGURABLE_ROLES = ['KASIR','GUDANG']`, `Permissions::DEFAULTS` (`['KASIR'=>[...keys true], 'GUDANG'=>[...]]`)
- `User::hasPermission(string $key): bool`, `User::permissionMap(): array<string,bool>`, `User::toAuthArray(): array`
- `RolePermission::configMatrix(): array` → `['KASIR'=>[key=>bool x14], 'GUDANG'=>[...]]`
- Kolom `users`: `username`, `role`, `phone`, `is_active`

- [ ] **Step 1: Pasang Sanctum**

```bash
cd backend
composer require laravel/sanctum:^4.0
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```
Di `config/sanctum.php` set `'expiration' => (int) env('SANCTUM_EXPIRATION', 720),` dan `'guard' => []` (hanya token Bearer, tanpa sesi cookie).

- [ ] **Step 2: Migrasi users**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->unique()->after('name');
            $table->string('role', 20)->default('KASIR')->after('email');
            $table->string('phone', 30)->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'role', 'phone', 'is_active']);
        });
    }
};
```

- [ ] **Step 3: Migrasi role_permissions**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role', 20);
            $table->string('permission_key', 50);
            $table->boolean('allowed')->default(false);
            $table->timestamps();
            $table->unique(['role', 'permission_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
```

- [ ] **Step 4: `App\Support\Permissions`**

```php
<?php

namespace App\Support;

final class Permissions
{
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'booking_dp', 'bon_receivable',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];

    public const ROLES = ['OWNER', 'KASIR', 'GUDANG'];

    public const CONFIGURABLE_ROLES = ['KASIR', 'GUDANG'];

    public const DEFAULTS = [
        'KASIR' => ['pos', 'receipt', 'booking_dp', 'bon_receivable'],
        'GUDANG' => ['inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname'],
    ];
}
```

- [ ] **Step 5: Tulis test gagal** `tests/Unit/UserPermissionTest.php`

```php
<?php

namespace Tests\Unit;

use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UserPermissionTest extends TestCase
{
    use DatabaseTransactions;

    private function makeUser(string $role, bool $active = true): User
    {
        return User::factory()->create(['role' => $role, 'is_active' => $active]);
    }

    public function test_owner_has_every_permission(): void
    {
        $owner = $this->makeUser('OWNER');
        $this->assertTrue($owner->hasPermission('accounting_hub'));
        $this->assertTrue($owner->hasPermission('role_settings'));
    }

    public function test_kasir_uses_role_permissions_table(): void
    {
        $kasir = $this->makeUser('KASIR');
        $this->assertTrue($kasir->hasPermission('pos'));
        $this->assertFalse($kasir->hasPermission('accounting_hub'));

        RolePermission::where(['role' => 'KASIR', 'permission_key' => 'pos'])->update(['allowed' => false]);
        $this->assertFalse($kasir->fresh()->hasPermission('pos'));
    }

    public function test_unknown_role_and_unknown_key_are_denied(): void
    {
        $this->assertFalse($this->makeUser('TAMU')->hasPermission('pos'));
        $this->assertFalse($this->makeUser('KASIR')->hasPermission('tidak_ada'));
    }

    public function test_inactive_user_has_no_permission_even_owner(): void
    {
        $this->assertFalse($this->makeUser('OWNER', false)->hasPermission('pos'));
    }

    public function test_auth_array_exposes_permission_map_without_password(): void
    {
        $data = $this->makeUser('GUDANG')->toAuthArray();
        $this->assertSame('GUDANG', $data['role']);
        $this->assertSame('Cabang 3 Magelang', $data['branch_name']);
        $this->assertTrue($data['permissions']['stock_opname']);
        $this->assertFalse($data['permissions']['pos']);
        $this->assertCount(14, $data['permissions']);
        $this->assertArrayNotHasKey('password', $data);
    }
}
```

Run `php artisan test --filter=UserPermissionTest` → FAIL (kolom/metode belum ada).

- [ ] **Step 6: Model `RolePermission`**

```php
<?php

namespace App\Models;

use App\Support\Permissions;
use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = ['role', 'permission_key', 'allowed'];

    protected function casts(): array
    {
        return ['allowed' => 'boolean'];
    }

    /** @return array<string, array<string, bool>> */
    public static function configMatrix(): array
    {
        $rows = static::whereIn('role', Permissions::CONFIGURABLE_ROLES)->get();
        $matrix = [];
        foreach (Permissions::CONFIGURABLE_ROLES as $role) {
            foreach (Permissions::KEYS as $key) {
                $matrix[$role][$key] = (bool) $rows
                    ->first(fn ($r) => $r->role === $role && $r->permission_key === $key)?->allowed;
            }
        }

        return $matrix;
    }
}
```

- [ ] **Step 7: Model `User`** — tambah `HasApiTokens`, fillable, cast, dan metode:

```php
use App\Support\Permissions;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'username', 'email', 'password', 'role', 'phone', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const BRANCH_NAME = 'Cabang 3 Magelang';

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function hasPermission(string $key): bool
    {
        return $this->permissionMap()[$key] ?? false;
    }

    /** @return array<string, bool> */
    public function permissionMap(): array
    {
        if (! $this->is_active || ! in_array($this->role, Permissions::ROLES, true)) {
            return array_fill_keys(Permissions::KEYS, false);
        }
        if ($this->role === 'OWNER') {
            return array_fill_keys(Permissions::KEYS, true);
        }

        $allowed = RolePermission::where('role', $this->role)->where('allowed', true)->pluck('permission_key')->all();

        return array_combine(Permissions::KEYS, array_map(fn ($k) => in_array($k, $allowed, true), Permissions::KEYS));
    }

    public function toAuthArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'phone' => $this->phone,
            'branch_name' => self::BRANCH_NAME,
            'is_active' => $this->is_active,
            'permissions' => $this->permissionMap(),
        ];
    }
}
```

- [ ] **Step 8: `RolePermissionSeeder`** (mengisi baris yang belum ada, tidak menimpa pilihan Owner)

```php
<?php

namespace Database\Seeders;

use App\Models\RolePermission;
use App\Support\Permissions;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Permissions::CONFIGURABLE_ROLES as $role) {
            foreach (Permissions::KEYS as $key) {
                RolePermission::firstOrCreate(
                    ['role' => $role, 'permission_key' => $key],
                    ['allowed' => in_array($key, Permissions::DEFAULTS[$role], true)]
                );
            }
        }
    }
}
```

- [ ] **Step 9: `UserSeeder`**

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('SEED_DEFAULT_PASSWORD');
        if (! $password) {
            throw new RuntimeException('SEED_DEFAULT_PASSWORD belum diisi di .env — dibutuhkan untuk membuat akun awal.');
        }

        $accounts = [
            ['username' => 'owner', 'name' => 'Agus Subagyo', 'email' => 'owner@omahban.com', 'role' => 'OWNER', 'phone' => '0822-2786-3969'],
            ['username' => 'kasir', 'name' => 'Kasir OB3', 'email' => 'kasir@omahban.com', 'role' => 'KASIR', 'phone' => '0812-3456-7893'],
            ['username' => 'gudang', 'name' => 'Admin Gudang OB3', 'email' => 'gudang@omahban.com', 'role' => 'GUDANG', 'phone' => '0812-3456-7892'],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                $account + ['password' => $password, 'is_active' => true]
            );
        }

        // Akun bawaan lama berpassword "password123" tidak boleh aktif.
        User::where('email', 'admin@omahban.com')->update(['is_active' => false]);
    }
}
```

- [ ] **Step 10:** `TestBaselineSeeder::run()` tambahkan `$this->call(RolePermissionSeeder::class);` (idempoten). Di `DatabaseSeeder` ganti blok "2. Default Users" (dua `User::firstOrCreate`) dengan:

```php
        // 2. Akun pengguna & hak akses per peran
        $this->call(UserSeeder::class);
        $this->call(RolePermissionSeeder::class);
```
Hapus import `Hash`/`User` jika tidak lagi dipakai. `.env.example` tambahkan `SEED_DEFAULT_PASSWORD=` dan `SANCTUM_EXPIRATION=720`.

- [ ] **Step 11:** Pastikan factory `UserFactory` tidak mengisi `role` (default kolom KASIR) — tidak perlu diubah. Migrasi DB testing: `DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force`; DB dev: `php artisan migrate`.
- [ ] **Step 12:** `php artisan test --filter=UserPermissionTest` → PASS; `php artisan test` → semua hijau.
- [ ] **Step 13: Commit** (DatabaseSeeder: stage hanya hunk blok user — lihat Global Constraints) `feat(auth): add Sanctum, user roles and role_permissions with deny-by-default rule`

---

### Task 3: Endpoint login / logout / me

**Files:**
- Create: `backend/app/Http/Controllers/Api/v1/AuthController.php`
- Modify: `backend/app/Providers/AppServiceProvider.php` (rate limiter `login`)
- Modify: `backend/routes/api.php` (tambah route auth; hapus `/user`)
- Test: `backend/tests/Feature/AuthApiTest.php`

**Interfaces — Consumes:** `User::toAuthArray()`. **Produces:** `POST /api/v1/auth/login` → `{token, expires_at, user}`; `POST /api/v1/auth/logout` → 204; `GET /api/v1/auth/me` → `{user}`.

- [ ] **Step 1: Test gagal**

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use DatabaseTransactions;

    private function user(array $attrs = []): User
    {
        return User::factory()->create($attrs + [
            'username' => 'kasir_t'.uniqid(),
            'role' => 'KASIR',
            'password' => 'rahasia-123',
        ]);
    }

    public function test_login_with_username_returns_token_and_user(): void
    {
        $u = $this->user();
        $res = $this->postJson('/api/v1/auth/login', ['login' => $u->username, 'password' => 'rahasia-123']);

        $res->assertOk()
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'username', 'role', 'permissions']])
            ->assertJsonPath('user.role', 'KASIR')
            ->assertJsonPath('user.permissions.pos', true);
    }

    public function test_login_with_email_case_insensitive(): void
    {
        $u = $this->user();
        $this->postJson('/api/v1/auth/login', ['login' => strtoupper($u->email), 'password' => 'rahasia-123'])->assertOk();
    }

    public function test_wrong_password_and_inactive_user_get_same_generic_error(): void
    {
        $u = $this->user();
        $this->postJson('/api/v1/auth/login', ['login' => $u->username, 'password' => 'salah'])
            ->assertStatus(422)->assertJsonPath('message', 'Username atau password salah.');

        $off = $this->user(['is_active' => false]);
        $this->postJson('/api/v1/auth/login', ['login' => $off->username, 'password' => 'rahasia-123'])
            ->assertStatus(422)->assertJsonPath('message', 'Username atau password salah.');

        $this->postJson('/api/v1/auth/login', ['login' => 'tidak-ada', 'password' => 'x'])
            ->assertStatus(422)->assertJsonPath('message', 'Username atau password salah.');
    }

    public function test_login_is_throttled_after_five_attempts(): void
    {
        $u = $this->user();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['login' => $u->username, 'password' => 'salah'])->assertStatus(422);
        }
        $this->postJson('/api/v1/auth/login', ['login' => $u->username, 'password' => 'salah'])->assertStatus(429);
    }

    public function test_me_returns_current_user(): void
    {
        $u = $this->user();
        $token = $u->createToken('test')->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('user.id', $u->id);
    }

    public function test_logout_revokes_token(): void
    {
        $u = $this->user();
        $token = $u->createToken('test')->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->assertSame(0, PersonalAccessToken::where('tokenable_id', $u->id)->count());

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_expired_token_is_rejected(): void
    {
        $u = $this->user();
        $token = $u->createToken('test', ['*'], now()->subMinute())->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_me_without_token_is_unauthorized(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
```

Run `php artisan test --filter=AuthApiTest` → FAIL (404).

- [ ] **Step 2: Rate limiter** di `AppServiceProvider::boot()`:

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('login', function (Request $request) {
    return Limit::perMinute(5)->by(strtolower((string) $request->input('login')).'|'.$request->ip());
});
```

- [ ] **Step 3: Controller**

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $login = strtolower(trim($data['login']));
        $user = User::whereRaw('LOWER(username) = ?', [$login])
            ->orWhereRaw('LOWER(email) = ?', [$login])
            ->first();

        if (! $user || ! $user->is_active || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Username atau password salah.'], 422);
        }

        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 720));
        $token = $user->createToken('pos-session', ['*'], $expiresAt)->plainTextToken;

        return response()->json([
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $user->toAuthArray(),
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->toAuthArray()]);
    }
}
```

- [ ] **Step 4: Routes** — hapus blok `Route::get('/user', ...)` beserta import `Request`. Di dalam `Route::prefix('v1')`:

```php
    Route::post('auth/login', [\App\Http\Controllers\Api\v1\AuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [\App\Http\Controllers\Api\v1\AuthController::class, 'logout']);
        Route::get('auth/me', [\App\Http\Controllers\Api\v1\AuthController::class, 'me']);
    });
```

- [ ] **Step 5:** `php artisan test --filter=AuthApiTest` → PASS; `php artisan test` → hijau.
- [ ] **Step 6: Commit** `feat(auth): add login, logout and me endpoints with throttling`

---

### Task 4: Proteksi seluruh API per izin

**Files:**
- Create: `backend/app/Http/Middleware/EnsurePermission.php`
- Create: `backend/app/Http/Controllers/Api/v1/RolePermissionController.php`
- Modify: `backend/bootstrap/app.php` (alias `permission`)
- Modify: `backend/routes/api.php` (tulis ulang pengelompokan)
- Modify: `backend/tests/TestCase.php` (autentikasi default OWNER)
- Modify (operator): `app/Services/FifoCostingService.php:121,167`, `app/Http/Controllers/Api/v1/InventoryController.php:138`, `ProductController.php:77`, `PosController.php:115`
- Test: `backend/tests/Feature/AuthorizationTest.php`

**Interfaces — Consumes:** `User::hasPermission`, `RolePermission::configMatrix`, `Permissions`. **Produces:** middleware alias `permission:key1,key2`; `GET/PUT /api/v1/settings/role-permissions`; `TestCase::$authenticateAsOwner` (bool, default true), `TestCase::actingAsRole(string $role): User`.

- [ ] **Step 1: TestCase** — autentikasi default sebagai OWNER agar test API lama tetap berjalan:

```php
<?php

namespace Tests;

use App\Models\User;
use Database\Seeders\TestBaselineSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /** Test yang menguji autentikasi sendiri menyetel ini ke false. */
    protected bool $authenticateAsOwner = true;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TestBaselineSeeder::class);

        if ($this->authenticateAsOwner) {
            $this->actingAsRole('OWNER');
        }
    }

    protected function actingAsRole(string $role): User
    {
        $user = User::firstOrCreate(
            ['email' => 'test-'.strtolower($role).'@omahban.test'],
            ['name' => 'Test '.$role, 'username' => 'test-'.strtolower($role), 'role' => $role, 'password' => 'secret-test', 'is_active' => true]
        );
        Sanctum::actingAs($user);

        return $user;
    }
}
```
Di `AuthApiTest` tambahkan `protected bool $authenticateAsOwner = false;`.

- [ ] **Step 2: Test gagal** `tests/Feature/AuthorizationTest.php`

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    protected bool $authenticateAsOwner = false;

    /** Sampel satu endpoint per kelompok izin. */
    public static function protectedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/products'],
            ['POST', '/api/v1/products'],
            ['POST', '/api/v1/pos/checkout'],
            ['GET', '/api/v1/pos/transactions'],
            ['POST', '/api/v1/inventory/restock'],
            ['POST', '/api/v1/stock/commit'],
            ['GET', '/api/v1/reports/stock-monthly'],
            ['GET', '/api/v1/expenses'],
            ['GET', '/api/v1/accounting/journals'],
            ['GET', '/api/v1/accounting/financial-statements'],
            ['GET', '/api/v1/accounting/accounts-payable'],
            ['POST', '/api/v1/settings/edc'],
            ['GET', '/api/v1/settings/role-permissions'],
            ['POST', '/api/v1/payment/qris/charge'],
        ];
    }

    #[DataProvider('protectedEndpoints')]
    public function test_requires_token(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
    }

    public function test_public_endpoints_stay_public(): void
    {
        $this->getJson('/api/v1/health')->assertOk();
        $this->assertNotSame(401, $this->postJson('/api/v1/payment/midtrans/webhook', [])->status());
    }

    public function test_kasir_is_denied_accounting_and_allowed_catalog(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/journals')->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak memiliki izin untuk aksi ini.');
        $this->getJson('/api/v1/expenses')->assertForbidden();
        $this->postJson('/api/v1/products', [])->assertForbidden();
        $this->getJson('/api/v1/products')->assertOk();
        $this->getJson('/api/v1/pos/transactions')->assertOk();
    }

    public function test_gudang_is_denied_checkout_and_allowed_inventory(): void
    {
        $this->actingAsRole('GUDANG');
        $this->postJson('/api/v1/pos/checkout', [])->assertForbidden();
        $this->getJson('/api/v1/accounting/trial-balance')->assertForbidden();
        $this->getJson('/api/v1/inventory/stock-movements')->assertOk();
        $this->getJson('/api/v1/products')->assertOk();
    }

    public function test_owner_is_allowed_everywhere(): void
    {
        $this->actingAsRole('OWNER');
        $this->getJson('/api/v1/accounting/journals')->assertOk();
        $this->getJson('/api/v1/expenses')->assertOk();
        $this->getJson('/api/v1/settings/role-permissions')->assertOk();
    }

    public function test_role_permission_matrix_read_and_update(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/settings/role-permissions')->assertOk()
            ->assertJsonPath('KASIR.pos', true)->assertJsonPath('GUDANG.pos', false);
        $this->putJson('/api/v1/settings/role-permissions', [])->assertForbidden();

        $this->actingAsRole('OWNER');
        $matrix = $this->getJson('/api/v1/settings/role-permissions')->json();
        $matrix['KASIR']['expenses'] = true;
        $matrix['OWNER'] = ['pos' => false];
        $this->putJson('/api/v1/settings/role-permissions', $matrix)->assertOk()
            ->assertJsonPath('KASIR.expenses', true)->assertJsonMissingPath('OWNER');

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/expenses')->assertOk();
    }

    public function test_update_rejects_unknown_keys(): void
    {
        $this->actingAsRole('OWNER');
        $this->putJson('/api/v1/settings/role-permissions', ['KASIR' => ['hapus_semua' => true]])->assertStatus(422);
    }

    public function test_deactivated_user_is_forbidden(): void
    {
        $kasir = $this->actingAsRole('KASIR');
        $kasir->update(['is_active' => false]);
        $this->getJson('/api/v1/products')->assertForbidden();
    }
}
```
Run → FAIL.

- [ ] **Step 3: Middleware**

```php
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
```
`bootstrap/app.php` → `$middleware->alias(['permission' => \App\Http\Middleware\EnsurePermission::class]);`

- [ ] **Step 4: RolePermissionController**

```php
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
```

- [ ] **Step 5: Tulis ulang `routes/api.php`** — struktur (semua controller di namespace `App\Http\Controllers\Api\v1`; pakai `use` di atas file):

```php
<?php

use App\Http\Controllers\Api\v1\{AccountController, AccountingReportController, AuthController, ExpenseController, InventoryController, PaymentApiController, PaymentMethodSettingController, PosController, ProductController, ReportStockMonthlyApiController, RolePermissionController, ServiceMasterController, StockReconciliationApiController, SupplierController};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // --- Publik ---
    Route::get('/health', /* closure lama, tidak diubah */);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('payment/midtrans/webhook', [PaymentApiController::class, 'handleWebhook']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('settings/role-permissions', [RolePermissionController::class, 'index']);
        Route::put('settings/role-permissions', [RolePermissionController::class, 'update'])->middleware('permission:role_settings');

        // Katalog (dibaca kasir & gudang)
        Route::middleware('permission:pos,inventory_view')->group(function () {
            Route::apiResource('products', ProductController::class)->only(['index', 'show']);
            Route::apiResource('services', ServiceMasterController::class)->only(['index', 'show']);
            Route::apiResource('suppliers', SupplierController::class)->only(['index', 'show']);
            Route::get('accounts', [AccountController::class, 'index']);
        });
        Route::middleware('permission:inventory_manage')->group(function () {
            Route::apiResource('products', ProductController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('services', ServiceMasterController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('suppliers', SupplierController::class)->only(['store', 'update', 'destroy']);
        });

        // POS
        Route::get('pos/payment-options', [PaymentMethodSettingController::class, 'getPaymentOptions'])->middleware('permission:pos');
        Route::post('pos/checkout', [PosController::class, 'checkout'])->middleware('permission:pos');
        Route::middleware('permission:pos,receipt')->group(function () {
            Route::get('pos/transactions', [PosController::class, 'index']);
            Route::get('pos/transactions/{id}', [PosController::class, 'show']);
        });
        Route::prefix('payment/qris')->middleware('permission:pos')->group(function () {
            Route::post('charge', [PaymentApiController::class, 'chargeQris']);
            Route::get('status/{orderId}', [PaymentApiController::class, 'checkQrisStatus']);
            Route::post('simulate/{orderId}', [PaymentApiController::class, 'simulateQrisSettlement']);
        });

        // Pengaturan metode bayar
        Route::middleware('permission:role_settings,pos')->group(function () {
            Route::get('settings/payment-providers', [PaymentMethodSettingController::class, 'indexProviders']);
            Route::get('settings/edc', [PaymentMethodSettingController::class, 'indexEdc']);
        });
        Route::middleware('permission:role_settings')->group(function () {
            Route::post('settings/payment-providers', [PaymentMethodSettingController::class, 'storeProvider']);
            Route::put('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'updateProvider']);
            Route::delete('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'deleteProvider']);
            Route::post('settings/edc', [PaymentMethodSettingController::class, 'storeEdc']);
            Route::put('settings/edc/{id}', [PaymentMethodSettingController::class, 'updateEdc']);
            Route::delete('settings/edc/{id}', [PaymentMethodSettingController::class, 'deleteEdc']);
        });

        // Inventori
        Route::post('inventory/restock', [InventoryController::class, 'restock'])->middleware('permission:goods_receipt');
        Route::get('inventory/stock-movements', [InventoryController::class, 'stockMovements'])->middleware('permission:inventory_view');
        Route::post('inventory/stock-opname', [InventoryController::class, 'stockOpname'])->middleware('permission:stock_opname');

        Route::prefix('stock')->middleware('permission:stock_opname')->group(function () {
            // 9 route stock/* lama, tidak diubah
        });

        Route::prefix('reports/stock-monthly')->group(function () {
            Route::get('/', [ReportStockMonthlyApiController::class, 'index'])->middleware('permission:inventory_view');
            Route::get('/export', [ReportStockMonthlyApiController::class, 'exportExcel'])->middleware('permission:inventory_view');
            Route::post('/inline-update', [ReportStockMonthlyApiController::class, 'inlineUpdate'])->middleware('permission:stock_opname');
        });

        // Beban
        Route::middleware('permission:expenses')->group(function () {
            // 5 route expense lama
        });

        // Akuntansi
        Route::prefix('accounting')->group(function () {
            Route::middleware('permission:accounting_hub')->group(function () {
                Route::get('journals', [AccountingReportController::class, 'journals']);
                Route::post('journals/manual', [AccountingReportController::class, 'createManualJournal']);
                Route::get('general-ledger', [AccountingReportController::class, 'generalLedger']);
                Route::get('trial-balance', [AccountingReportController::class, 'trialBalance']);
            });
            Route::get('financial-statements', [AccountingReportController::class, 'financialStatements'])->middleware('permission:financial_reports');
            Route::middleware('permission:accounts_payable')->group(function () {
                Route::get('accounts-payable', [AccountingReportController::class, 'accountsPayable']);
                Route::post('accounts-payable/pay', [AccountingReportController::class, 'payDebt']);
            });
        });
    });
});
```
Salin isi closure `/health` dan route `stock/*` & `expenses` apa adanya dari file lama. Verifikasi jumlah route: `php artisan route:list --path=api/v1` sebelum vs sesudah — semua path lama masih ada, ditambah 5 path auth/role-permissions.

- [ ] **Step 6: Nama operator dari pengguna login**
  - `FifoCostingService.php:121` → `'operator_name' => auth()->user()?->name ?? 'Kasir POS',`
  - `FifoCostingService.php:167` → `'operator_name' => auth()->user()?->name ?? 'Admin Gudang',`
  - `InventoryController.php:138` → `'operator_name' => $request->user()?->name ?? 'Admin Opname',`
  - `ProductController.php:77` → `'operator_name' => $request->user()?->name ?? 'Admin Gudang',` (pastikan `$request` tersedia di scope closure; tambahkan ke `use (...)` bila di dalam closure)
  - `PosController.php:115` → `'cashier_name' => $request->user()?->name ?? $validated['cashier_name'] ?? 'Kasir POS',`
- [ ] **Step 7:** `php artisan test` → semua hijau (test lama berjalan sebagai OWNER).
- [ ] **Step 8: Commit** `feat(auth): enforce per-role permissions on every v1 endpoint`

---

### Task 5: Frontend — token di apiClient & authApi

**Files:**
- Modify: `src/services/api/apiClient.ts`
- Create: `src/services/api/authApi.ts`
- Modify: `src/services/api/index.ts` (export `authApi`)
- Modify: `src/shared/types/index.ts` (`UserSession.id: string | number`, `permissions?: Record<PermissionKey, boolean>`, `username?`, `is_active?`)
- Test: `src/services/__tests__/apiClient.test.ts`

**Interfaces — Produces:**
- `authToken.get(): string | null`, `authToken.set(token: string): void`, `authToken.clear(): void` (localStorage `ob3_auth_token`, aman bila localStorage tidak tersedia)
- `setUnauthorizedHandler(handler: (() => void) | null): void`
- `authApi.login(login: string, password: string): Promise<{ token: string; expires_at: string; user: UserSession }>` (menyimpan token)
- `authApi.logout(): Promise<void>` (selalu membersihkan token, abaikan error jaringan)
- `authApi.me(): Promise<UserSession>`
- `authApi.getRolePermissions(): Promise<RolePermissionsConfig>`
- `authApi.updateRolePermissions(config: RolePermissionsConfig): Promise<RolePermissionsConfig>`

- [ ] **Step 1: Test gagal**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, authToken, setUnauthorizedHandler, ApiError } from '../api/apiClient';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const mockFetch = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('apiClient auth', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it('sends bearer token when present', async () => {
    authToken.set('abc');
    const fetchMock = mockFetch(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await apiClient.get('/products');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  it('omits Authorization without token', async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchMock);
    await apiClient.get('/health');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('clears token and calls handler on 401', async () => {
    authToken.set('expired');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', mockFetch(401, { message: 'Unauthenticated.' }));
    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(authToken.get()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call handler on 403', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', mockFetch(403, { message: 'Anda tidak memiliki izin untuk aksi ini.' }));
    await expect(apiClient.get('/accounting/journals')).rejects.toMatchObject({ status: 403 });
    expect(handler).not.toHaveBeenCalled();
  });
});
```
Run `npx vitest run src/services/__tests__/apiClient.test.ts` → FAIL.

- [ ] **Step 2: apiClient** — tambahkan di atas `request`:

```ts
const TOKEN_KEY = 'ob3_auth_token';

const safeStorage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export const authToken = {
  get: (): string | null => safeStorage()?.getItem(TOKEN_KEY) ?? null,
  set: (token: string) => safeStorage()?.setItem(TOKEN_KEY, token),
  clear: () => safeStorage()?.removeItem(TOKEN_KEY),
};

let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};
```
Di `request`: setelah menyusun `headers`, `const token = authToken.get(); if (token) headers.Authorization = \`Bearer ${token}\`;`. Di cabang `!response.ok`, sebelum `throw`: `if (response.status === 401) { authToken.clear(); unauthorizedHandler?.(); }`. Pesan timeout ganti menjadi `` `Koneksi ke backend Laravel timeout (melebihi ${timeoutMs / 1000} detik)` `` (pindahkan `timeoutMs` ke scope luar `try`).

- [ ] **Step 3: authApi**

```ts
import { apiClient, authToken } from './apiClient';
import { RolePermissionsConfig, UserSession } from '../../shared/types';

interface LoginResponse {
  token: string;
  expires_at: string;
  user: UserSession;
}

export const authApi = {
  async login(login: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', { login, password });
    authToken.set(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Token tetap dibuang di sisi klien walau server tidak terjangkau.
    } finally {
      authToken.clear();
    }
  },

  async me(): Promise<UserSession> {
    const res = await apiClient.get<{ user: UserSession }>('/auth/me');
    return res.user;
  },

  getRolePermissions: () => apiClient.get<RolePermissionsConfig>('/settings/role-permissions'),

  updateRolePermissions: (config: RolePermissionsConfig) =>
    apiClient.put<RolePermissionsConfig>('/settings/role-permissions', config),
};
```
Catatan: `logout` dengan 204 — `response.json()` sudah di-`catch(() => null)`, aman.

- [ ] **Step 4: Tipe** — `UserSession`: `id: string | number; username?: string; is_active?: boolean; permissions?: Record<PermissionKey, boolean>;`. Hapus `UserAccount` bila tidak ada pemakai tersisa setelah Task 6 (cek dengan grep di Task 6).
- [ ] **Step 5:** `npx vitest run src/services/__tests__/apiClient.test.ts` → PASS; `npm run lint` tanpa error baru.
- [ ] **Step 6: Commit** `feat(auth): attach bearer token in apiClient and add authApi`

---

### Task 6: Frontend — sesi server di App, Login, Navbar, Pengaturan

**Files:**
- Modify: `src/App.tsx` (state `currentUser`, `rolePermissions`, `users`, sinkron Supabase users/perms, login/logout, `onSwitchUser`, `SettingsScreen.onSavePermissions`)
- Modify: `src/modules/auth/LoginScreen.tsx`
- Modify: `src/shared/components/HeaderNavbar.tsx` (hapus pengalih peran)
- Modify: `src/modules/settings/SettingsScreen.tsx` (hapus default `DEFAULT_USERS[0]`)
- Modify: `src/shared/data/mockData.ts` (hapus `DEFAULT_USERS`)
- Modify: `src/services/authNavigationService.ts` (deny-by-default; tambah `hasPermission`)
- Modify: `src/modules/inventory/components/StockMonthlyLedgerView.tsx:70,131` (pakai `apiClient`)
- Test: `src/services/__tests__/authNavigationService.test.ts`

**Interfaces — Consumes:** `authApi`, `authToken`, `setUnauthorizedHandler`. **Produces:** `hasPermission(user: UserSession | null, config: RolePermissionsConfig, key: PermissionKey): boolean`.

- [ ] **Step 1: Test gagal** — tambahkan ke `authNavigationService.test.ts`:

```ts
import { hasPermission, isScreenPermittedForRole } from '../authNavigationService';
import { DEFAULT_ROLE_PERMISSIONS } from '../../shared/data/mockData';

describe('deny by default', () => {
  it('denies unknown roles', () => {
    expect(isScreenPermittedForRole('dashboard', 'TAMU', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
  });

  it('hasPermission: owner all, others from config, null user none', () => {
    const owner = { id: 1, name: 'O', email: 'o@x', role: 'OWNER', branch_name: 'x' } as const;
    const kasir = { ...owner, role: 'KASIR' } as const;
    expect(hasPermission(owner, DEFAULT_ROLE_PERMISSIONS, 'accounting_hub')).toBe(true);
    expect(hasPermission(kasir, DEFAULT_ROLE_PERMISSIONS, 'booking_dp')).toBe(true);
    expect(hasPermission(kasir, DEFAULT_ROLE_PERMISSIONS, 'goods_receipt')).toBe(false);
    expect(hasPermission(null, DEFAULT_ROLE_PERMISSIONS, 'pos')).toBe(false);
  });
});
```
Sesuaikan/hapus test lama yang mengharapkan peran tak dikenal diizinkan. Run → FAIL.

- [ ] **Step 2: authNavigationService** — ganti `if (!roleConfig) return true;` menjadi `return false;` dan tambahkan:

```ts
export function hasPermission(
  user: UserSession | null | undefined,
  rolePermissions: RolePermissionsConfig,
  key: PermissionKey
): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  const roleConfig = rolePermissions[user.role as keyof RolePermissionsConfig];
  return !!roleConfig?.[key];
}
```
(import `PermissionKey`, `UserSession` dari `../shared/types`). Run test → PASS.

- [ ] **Step 3: LoginScreen**
  - Props menjadi `{ onLogin: (user: UserSession) => void }`; hapus import `DEFAULT_USERS`, `UserAccount`, `handleQuickLogin` dan seluruh blok daftar akun cepat (`users.map(...)` sekitar baris 172).
  - State awal `identifier`/`password` = `''`; tambah `isSubmitting`.
  - Submit:

```ts
const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMessage('');
  setIsSubmitting(true);
  try {
    const { user } = await authApi.login(identifier.trim(), password);
    onLogin(user);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    setErrorMessage(
      status === 0 || status === 408
        ? 'Server tidak dapat dihubungi. Pastikan backend Laravel berjalan.'
        : status === 429
          ? 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.'
          : err instanceof ApiError ? err.message : 'Login gagal.'
    );
  } finally {
    setIsSubmitting(false);
  }
};
```
  - Tombol submit `disabled={isSubmitting}` dan label "Memeriksa..." saat submit. Input `autoComplete="username"` / `"current-password"`.
- [ ] **Step 4: HeaderNavbar** — hapus prop `onSwitchUser`, import `DEFAULT_USERS`, dan blok "Ganti Peran Pengguna (Demo)" (sekitar baris 282–310). `currentUser` menjadi prop wajib (tanpa default).
- [ ] **Step 5: SettingsScreen** — `currentUser` prop wajib; hapus import `DEFAULT_USERS`.
- [ ] **Step 6: mockData** — hapus `DEFAULT_USERS`. `grep -rn "DEFAULT_USERS\|UserAccount\|ob3_users\|ob3_user_session" src` harus kosong kecuali `supabaseDataService.ts` (ubah tipe fungsi user di sana ke `UserSession` atau hapus `fetchUsersFromSupabase`/`upsertUserToSupabase` bila tidak dipakai lagi).
- [ ] **Step 7: App.tsx**
  - `currentUser` awal `null`; tambah `const [authChecking, setAuthChecking] = useState<boolean>(() => !!authToken.get());`
  - `rolePermissions` awal `DEFAULT_ROLE_PERMISSIONS` (tanpa localStorage); hapus efek `localStorage.setItem('ob3_role_permissions', ...)`.
  - Hapus state `users` + efek `ob3_users`, hapus `sbUsers`/`sbPerms` dari sinkron Supabase (`setUsers`, `setRolePermissions(sbPerms)`, dan panggilannya di `Promise.all`), dan import `upsertUserToSupabase`, `saveRolePermissionsToSupabase` bila tak terpakai.
  - Efek sesi:

```ts
const endSession = useCallback((message?: string) => {
  authToken.clear();
  setCurrentUser(null);
  setActiveScreen('dashboard');
  if (message) toast.warning('Sesi Berakhir', message);
}, [toast]);

useEffect(() => {
  setUnauthorizedHandler(() => endSession('Sesi berakhir, silakan login kembali.'));
  return () => setUnauthorizedHandler(null);
}, [endSession]);

const startSession = useCallback(async (user: UserSession) => {
  const permissions = await authApi.getRolePermissions().catch(() => DEFAULT_ROLE_PERMISSIONS);
  setRolePermissions(permissions);
  setCurrentUser(user);
  setActiveScreen(getDefaultScreenForUser(user.role, permissions));
}, []);

useEffect(() => {
  if (!authToken.get()) return;
  authApi.me()
    .then(startSession)
    .catch(() => authToken.clear())
    .finally(() => setAuthChecking(false));
}, [startSession]);
```
  - `handleLogout`: `await authApi.logout(); setCurrentUser(null); setActiveScreen('dashboard'); toast.info(...)`. Hapus `localStorage.removeItem('ob3_user_session')`.
  - Render: bila `authChecking` → layar memuat sederhana ("Memeriksa sesi..."); bila `!currentUser` → `<LoginScreen onLogin={async (user) => { await startSession(user); toast.success(...); }} />`.
  - `HeaderNavbar`: hapus prop `onSwitchUser`.
  - `SettingsScreen.onSavePermissions`:

```ts
onSavePermissions={async (newPerms) => {
  try {
    setRolePermissions(await authApi.updateRolePermissions(newPerms));
    toast.success('Hak Akses Disimpan', 'Perubahan izin peran berlaku seketika.');
  } catch (err) {
    toast.error('Gagal Menyimpan Hak Akses', err instanceof Error ? err.message : 'Terjadi kesalahan.');
  }
}}
```
  Periksa `RolePermissionsTab` agar tidak menampilkan toast sukses ganda; bila ada, hapus toast di tab.
- [ ] **Step 8: StockMonthlyLedgerView** — ganti dua `fetch` mentah dengan `apiClient.get('/reports/stock-monthly', { month: selectedMonth, brand })` dan `apiClient.post('/reports/stock-monthly/inline-update', payload)`; sesuaikan pengolahan respons (apiClient sudah mengembalikan JSON dan melempar `ApiError` pada non-2xx). Pertahankan fallback klien yang ada pada blok `catch`.
- [ ] **Step 9:** `npm run lint` bersih dari error baru; `npm test` hijau.
- [ ] **Step 10: Commit** `feat(auth): use server sessions in login, navbar and role settings; remove demo role switcher`

---

### Task 7: Frontend — izin detail menyembunyikan aksi

**Files:**
- Modify: `src/App.tsx` (kirim flag izin ke `PosScreen` & `InventoryScreen`)
- Modify: `src/modules/pos/PosScreen.tsx` (tombol Booking DP header ~735, tab BON ~1460, tab Booking DP ~1478)
- Modify: `src/modules/inventory/InventoryScreen.tsx` (Import Excel ~595, Tambah Master Produk ~605, aksi restock baris ~794, edit/nonaktif baris, `onOpenOpname` ~947, sub-view kategori/jasa/supplier)

**Interfaces — Consumes:** `hasPermission`. **Produces:** prop `PosScreen.permissions?: { bookingDp: boolean; bon: boolean }` (default semua `true`); `InventoryScreen.permissions?: { manage: boolean; goodsReceipt: boolean; stockOpname: boolean }` (default semua `true`).

- [ ] **Step 1: App** — hitung dan kirim:

```ts
const can = (key: PermissionKey) => hasPermission(currentUser, rolePermissions, key);
// <PosScreen permissions={{ bookingDp: can('booking_dp'), bon: can('bon_receivable') }} ... />
// <InventoryScreen permissions={{ manage: can('inventory_manage'), goodsReceipt: can('goods_receipt'), stockOpname: can('stock_opname') }} ... />
```
- [ ] **Step 2: PosScreen** — destrukturisasi `permissions = { bookingDp: true, bon: true }`. Render tombol header "Booking DP" dan tab "Booking DP" hanya bila `permissions.bookingDp`; tab "BON (Piutang)" hanya bila `permissions.bon`. Tambah efek: bila `cartMode` adalah mode yang tidak diizinkan → `setCartMode('REGULAR')`.
- [ ] **Step 3: InventoryScreen** — destrukturisasi `permissions = { manage: true, goodsReceipt: true, stockOpname: true }`:
  - "Import Excel Stok Ban" dan pembuka opname hanya bila `stockOpname` (untuk `onOpenOpname`, kirim `undefined` bila tidak diizinkan dan pastikan komponen penerima menyembunyikan tombolnya bila handler `undefined`).
  - "Tambah Master Produk", tombol edit & nonaktif/hapus baris hanya bila `manage`.
  - Tombol restock baris dan "Penerimaan Barang" hanya bila `goodsReceipt`.
  - Sub-view kategori, jasa, supplier: kirim handler simpan/hapus/toggle sebagai `undefined` bila `!manage`, lalu di setiap sub-view sembunyikan tombol tambah/ubah/hapus/toggle bila handler terkait `undefined`.
- [ ] **Step 4:** `npm run lint` dan `npm test` hijau.
- [ ] **Step 5: Commit** `feat(auth): hide booking, BON, goods receipt, opname and master-data actions without permission`

---

### Task 8: Verifikasi end-to-end di browser

- [ ] **Step 1:** Set `SEED_DEFAULT_PASSWORD` di `backend/.env` (lokal, tidak di-commit), lalu `cd backend && php artisan migrate && php artisan db:seed --class=UserSeeder && php artisan db:seed --class=RolePermissionSeeder`.
- [ ] **Step 2:** Jalankan backend (`php artisan serve`) dan frontend (`npm run dev`).
- [ ] **Step 3:** Cek di browser:
  - Buka aplikasi tanpa token → layar login, bukan dashboard OWNER.
  - Password salah → "Username atau password salah."; password `password` tidak lagi diterima.
  - Login `owner` → dashboard; reload → tetap login; menu pengguna tidak punya "Ganti Peran".
  - Login `kasir` → POS; Booking DP & BON terlihat; ubah izin KASIR (hapus `booking_dp`) sebagai owner → login kasir lagi → tombol Booking DP hilang.
  - Login `gudang` → inventori; Buku Stok FIFO memuat data (endpoint terautentikasi).
  - Logout → kembali ke login; token di localStorage terhapus.
  - Hapus token di DevTools lalu lakukan aksi yang memanggil API → kembali ke login dengan pesan sesi berakhir.
- [ ] **Step 4:** `cd backend && php artisan test` dan `npm test` terakhir kali — hijau.
