<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\NotificationService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class NotificationServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new NotificationService(); }
    protected function sampleCreateData(): array
    {
        return ['name' => 'Test Notification', 'content' => 'Hello members', 'notification_template_id' => 1];
    }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Notification']; }
}
