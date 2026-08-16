<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\FeeService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class FeeServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new FeeService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Fee', 'amount' => 1000, 'year' => 2026]; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Fee']; }
}
