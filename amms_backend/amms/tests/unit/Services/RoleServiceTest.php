<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\RoleService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class RoleServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new RoleService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Role']; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Role']; }
}
