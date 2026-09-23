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
