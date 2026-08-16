<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\RoleService;

class RolesController extends CrudApiController
{
    protected string $validationKey = 'roles';
    protected string $resourceLabel = 'Role';

    protected function initService(): BaseService
    {
        return new RoleService();
    }
}
