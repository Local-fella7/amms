<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\LogService;

class LogsController extends CrudApiController
{
    protected string $validationKey = 'logs';
    protected string $resourceLabel = 'Log';

    protected function initService(): BaseService
    {
        return new LogService();
    }
}
