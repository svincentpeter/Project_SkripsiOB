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
