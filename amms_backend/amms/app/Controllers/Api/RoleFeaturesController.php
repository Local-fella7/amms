<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\RoleFeatureService;

class RoleFeaturesController extends CrudApiController
{
    protected string $validationKey = 'roles_features';
    protected string $resourceLabel = 'Role feature';

    protected function initService(): BaseService
    {
        return new RoleFeatureService();
    }
}
