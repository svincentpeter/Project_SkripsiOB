<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_check_returns_successful_response(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'app',
                'database',
                'database_status',
                'timestamp',
            ])
            ->assertJson([
                'status' => 'healthy',
                'database_status' => 'connected',
            ]);
    }
}
