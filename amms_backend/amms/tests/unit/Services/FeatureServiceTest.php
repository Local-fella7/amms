<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\FeatureService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class FeatureServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new FeatureService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Feature', 'features_group_id' => 1]; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Feature']; }
}
