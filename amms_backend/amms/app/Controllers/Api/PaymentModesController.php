<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\PaymentModeService;

class PaymentModesController extends CrudApiController
{
    protected string $validationKey = 'payment_modes';
    protected string $resourceLabel = 'Payment mode';

    protected function initService(): BaseService
    {
        return new PaymentModeService();
    }
}
