<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\PaymentModeService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class PaymentModeServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new PaymentModeService(); }
    protected function sampleCreateData(): array { return ['name' => 'Cheque']; }
    protected function sampleUpdateData(): array { return ['name' => 'Updated Cheque']; }
}
