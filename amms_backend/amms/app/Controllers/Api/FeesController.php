<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\FeeService;

class FeesController extends CrudApiController
{
    protected string $validationKey = 'fee';
    protected string $resourceLabel = 'Fee';

    protected function initService(): BaseService
    {
        return new FeeService();
    }
}
