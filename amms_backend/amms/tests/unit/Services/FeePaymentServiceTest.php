<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\FeePaymentService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class FeePaymentServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new FeePaymentService(); }
    protected function sampleCreateData(): array
    {
        return [
            'date' => '2026-01-15', 'payment_mode_id' => 1,
            'amount' => 50000, 'fee_id' => 1, 'member_id' => 1,
        ];
    }
    protected function sampleUpdateData(): array { return ['amount' => 55000]; }

    public function testCreateIncludesBalanceFields(): void
    {
        $service = new FeePaymentService();
        $created = $service->create([
            'date' => '2026-01-15', 'payment_mode_id' => 1,
            'amount' => 20000, 'fee_id' => 1, 'member_id' => 1,
        ]);

        $this->assertEquals(50000.0, $created['fee_amount']);
        $this->assertEquals(20000.0, $created['total_paid']);
        $this->assertEquals(30000.0, $created['outstanding']);
    }

    public function testGetOutstandingForAllMembers(): void
    {
        $service = new FeePaymentService();
        $service->create([
            'date' => '2026-01-15', 'payment_mode_id' => 1,
            'amount' => 20000, 'fee_id' => 1, 'member_id' => 1,
        ]);

        $outstanding = $service->getOutstanding();

        $this->assertNotEmpty($outstanding);
        $this->assertEquals(1, $outstanding[0]['member_id']);
        $this->assertEquals(50000.0, $outstanding[0]['fee_amount']);
        $this->assertEquals(20000.0, $outstanding[0]['total_paid']);
        $this->assertEquals(30000.0, $outstanding[0]['outstanding']);
    }

    public function testGetOutstandingForSingleMember(): void
    {
        $service = new FeePaymentService();
        $service->create([
            'date' => '2026-01-15', 'payment_mode_id' => 1,
            'amount' => 50000, 'fee_id' => 1, 'member_id' => 1,
        ]);

        $outstanding = $service->getOutstanding(1, 1);

        $this->assertCount(1, $outstanding);
        $this->assertEquals(0.0, $outstanding[0]['outstanding']);
    }
}
