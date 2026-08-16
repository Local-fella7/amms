<?php

namespace App\Services;

use App\Models\PaymentModeModel;

class PaymentModeService extends BaseService
{
    protected string $resourceName = 'payment_mode';

    public function __construct()
    {
        parent::__construct();
        $this->model = new PaymentModeModel();
    }
}
