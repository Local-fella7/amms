<?php

namespace App\Controllers\Api;

use App\Services\AgeGroupService;
use App\Services\BaseService;

class AgeGroupsController extends CrudApiController
{
    protected string $validationKey = 'age_groups';
    protected string $resourceLabel = 'Age group';

    protected function initService(): BaseService
    {
        return new AgeGroupService();
    }
}
