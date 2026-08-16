<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\RoleFeatureService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class RoleFeatureServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new RoleFeatureService(); }
    protected function sampleCreateData(): array { return ['role_id' => 2, 'feature_id' => 2]; }
    protected function sampleUpdateData(): array { return ['role_id' => 3]; }
}
