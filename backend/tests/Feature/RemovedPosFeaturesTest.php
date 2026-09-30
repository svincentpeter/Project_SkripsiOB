<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DP/booking inden, BON (piutang) dan EDC dihapus dari POS: endpoint lamanya tidak ada lagi.
 */
class RemovedPosFeaturesTest extends TestCase
{
    use DatabaseTransactions;

    public static function removedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings/1/cancel'],
            ['GET', '/api/v1/receivables'],
            ['POST', '/api/v1/receivables/1/payments'],
            ['GET', '/api/v1/settings/edc'],
            ['POST', '/api/v1/settings/edc'],
            ['PUT', '/api/v1/settings/edc/1'],
            ['DELETE', '/api/v1/settings/edc/1'],
        ];
    }

    #[DataProvider('removedEndpoints')]
    public function test_removed_endpoint_returns_404(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertNotFound();
    }

    public function test_payment_options_only_list_bank_and_qris_providers(): void
    {
        $this->getJson('/api/v1/pos/payment-options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['bank_providers', 'qris_providers']])
            ->assertJsonMissingPath('data.edc_settings');
    }
}
