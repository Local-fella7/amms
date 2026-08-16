<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\FeatureService;

class FeaturesController extends CrudApiController
{
    protected string $validationKey = 'features';
    protected string $resourceLabel = 'Feature';

    protected function initService(): BaseService
    {
        return new FeatureService();
    }
}
