<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\LocationService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class LocationServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new LocationService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Location']; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Location']; }
}
