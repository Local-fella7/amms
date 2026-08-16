<?php

namespace Tests\Feature\Api;

use Tests\Support\ApiTestCase;

/**
 * @internal
 */
final class FeePaymentOutstandingApiTest extends ApiTestCase
{
    public function testOutstandingRequiresAuthentication(): void
    {
        $this->get('api/fee-payments/outstanding')->assertStatus(401);
    }

    public function testOutstandingReturnsAllMembers(): void
    {
        $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/fee-payments', [
                'date' => '2026-02-01', 'payment_mode_id' => 1, 'amount' => 15000, 'fee_id' => 1, 'member_id' => 1,
            ])
            ->assertStatus(201);

        $result = $this->withHeaders($this->authHeaders())->get('api/fee-payments/outstanding');
        $result->assertStatus(200);

        $json = json_decode($result->getJSON(), true);
        $this->assertNotEmpty($json['data']);
        $this->assertEquals(50000.0, $json['data'][0]['fee_amount']);
        $this->assertEquals(15000.0, $json['data'][0]['total_paid']);
        $this->assertEquals(35000.0, $json['data'][0]['outstanding']);
    }

    public function testOutstandingForSingleMember(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/fee-payments/outstanding/1');
        $result->assertStatus(200);

        $json = json_decode($result->getJSON(), true);
        $this->assertCount(1, $json['data']);
        $this->assertEquals(1, $json['data'][0]['member_id']);
        $this->assertEquals(50000.0, $json['data'][0]['outstanding']);
    }

    public function testPaymentListIncludesBalanceFields(): void
    {
        $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/fee-payments', [
                'date' => '2026-02-01', 'payment_mode_id' => 1, 'amount' => 10000, 'fee_id' => 1, 'member_id' => 1,
            ])
            ->assertStatus(201);

        $result = $this->withHeaders($this->authHeaders())->get('api/fee-payments');
        $result->assertStatus(200);

        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('fee_amount', $json['data'][0]);
        $this->assertArrayHasKey('total_paid', $json['data'][0]);
        $this->assertArrayHasKey('outstanding', $json['data'][0]);
    }
}
