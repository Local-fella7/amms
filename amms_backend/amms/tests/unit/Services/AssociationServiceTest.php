<?php

namespace Tests\Unit\Services;

use App\Services\AssociationService;
use App\Services\BaseService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class AssociationServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new AssociationService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Association']; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Association']; }
}
