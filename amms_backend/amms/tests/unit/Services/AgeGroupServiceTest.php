<?php

namespace Tests\Unit\Services;

use App\Services\AgeGroupService;
use App\Services\BaseService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class AgeGroupServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new AgeGroupService(); }
    protected function sampleCreateData(): array { return ['name' => 'Infant', 'from_age' => 0, 'to_age' => 5]; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Infant']; }
}
