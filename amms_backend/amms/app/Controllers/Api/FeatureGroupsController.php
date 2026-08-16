<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\FeatureGroupService;

class FeatureGroupsController extends CrudApiController
{
    protected string $validationKey = 'features_group';
    protected string $resourceLabel = 'Feature group';

    protected function initService(): BaseService
    {
        return new FeatureGroupService();
    }
}
