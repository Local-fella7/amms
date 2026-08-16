<?php

namespace App\Services;

use App\Models\FeeModel;

class FeeService extends BaseService
{
    protected string $resourceName = 'fee';

    public function __construct()
    {
        parent::__construct();
        $this->model = new FeeModel();
    }
}
