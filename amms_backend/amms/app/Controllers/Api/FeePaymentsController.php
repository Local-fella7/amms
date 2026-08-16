<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\FeePaymentService;

class FeePaymentsController extends CrudApiController
{
    protected string $validationKey = 'fee_payments';
    protected string $resourceLabel = 'Fee payment';

    protected function initService(): BaseService
    {
        return new FeePaymentService();
    }

    public function outstanding($memberId = null)
    {
        $memberId = $memberId !== null ? (int) $memberId : null;
        $feeId = $this->request->getGet('fee_id');
        $feeId = $feeId !== null && $feeId !== '' ? (int) $feeId : null;

        if ($memberId !== null && $memberId <= 0) {
            return $this->error('Invalid member ID', 422);
        }

        if ($feeId !== null && $feeId <= 0) {
            return $this->error('Invalid fee ID', 422);
        }

        if ($memberId !== null && ! $this->service->memberExists($memberId)) {
            return $this->notFound('Member not found');
        }

        if ($feeId !== null && ! $this->service->feeExists($feeId)) {
            return $this->notFound('Fee not found');
        }

        /** @var FeePaymentService $service */
        $service = $this->service;
        $records = $service->getOutstanding($memberId, $feeId);

        return $this->success($records, 'Outstanding balances retrieved');
    }
}
