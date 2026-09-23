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
            ->assertJsonPath('user.permissions.pos', true)
            ->assertJsonMissingPath('user.password');
    }

    public function test_login_with_email_case_insensitive(): void
    {
        $u = $this->user();
        $this->postJson('/api/v1/auth/login', ['login' => strtoupper($u->email), 'password' => 'rahasia-123'])->assertOk();
    }

    public function test_wrong_password_inactive_and_unknown_user_get_same_generic_error(): void
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
