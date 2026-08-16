<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\MemberService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class MemberServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new MemberService(); }
    protected function sampleCreateData(): array
    {
        return [
            'first_name' => 'Jane', 'last_name' => 'Smith', 'gender' => 'female',
            'location_id' => 1, 'age_group_id' => 1, 'member_status' => 'active',
        ];
    }
    protected function sampleUpdateData(): array { return ['first_name' => 'Janet']; }
}
