<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\FeatureGroupService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class FeatureGroupServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new FeatureGroupService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Feature Group']; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Feature Group']; }
}
