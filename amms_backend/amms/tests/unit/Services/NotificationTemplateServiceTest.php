<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\NotificationTemplateService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class NotificationTemplateServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new NotificationTemplateService(); }
    protected function sampleCreateData(): array { return ['name' => 'Test Template', 'content' => 'Hello {{name}}']; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Template']; }
}
