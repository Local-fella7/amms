<?php

namespace Tests\Feature\Api;

use Tests\Support\ApiTestCase;

/**
 * @internal
 */
final class ReportsApiTest extends ApiTestCase
{
    public function testReportsRequireAuthentication(): void
    {
        $this->get('api/reports/members')->assertStatus(401);
    }

    public function testMembersReportReturnsPdf(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/members');
        $result->assertStatus(200);
        $result->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $result->response()->getBody());
    }

    public function testOutstandingReportReturnsPdf(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/outstanding');
        $result->assertStatus(200);
        $this->assertStringStartsWith('%PDF', $result->response()->getBody());
    }

    public function testProfileReportReturnsPdfForMember(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/profile/1');
        $result->assertStatus(200);
        $this->assertStringStartsWith('%PDF', $result->response()->getBody());
    }

    public function testProfileReportReturns404ForMissingMember(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/profile/999999');
        $result->assertStatus(404);
    }

    public function testMemberHistoryReportReturnsPdf(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/member-history/1');
        $result->assertStatus(200);
        $this->assertStringStartsWith('%PDF', $result->response()->getBody());
    }

    public function testFeePaymentsReportReturnsPdf(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/fee-payments');
        $result->assertStatus(200);
        $this->assertStringStartsWith('%PDF', $result->response()->getBody());
    }

    public function testDeceasedReportReturnsPdf(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/reports/deceased');
        $result->assertStatus(200);
        $this->assertStringStartsWith('%PDF', $result->response()->getBody());
    }
}
