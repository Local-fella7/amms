<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\NotificationMemberService;
use App\Services\NotificationService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class NotificationMemberServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new NotificationMemberService(); }

    protected function sampleCreateData(): array
    {
        $notification = (new NotificationService())->create([
            'name' => 'Dispatch Test', 'content' => 'Body',
        ]);
        return ['notification_id' => $notification['id'], 'member_id' => 1];
    }

    protected function sampleUpdateData(): array { return ['member_id' => 1]; }
}
