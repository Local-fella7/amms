<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\LogService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class LogServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new LogService(); }
    protected function sampleCreateData(): array
    {
        return [
            'feature_id' => 1, 'user_id' => 1,
            'datetime' => '2026-01-01 10:00:00',
            'before' => '{}', 'after' => '{"test":true}',
        ];
    }
    protected function sampleUpdateData(): array { return ['after' => '{"updated":true}']; }
}
