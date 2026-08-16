<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\LocationService;

class LocationsController extends CrudApiController
{
    protected string $validationKey = 'locations';
    protected string $resourceLabel = 'Location';

    protected function initService(): BaseService
    {
        return new LocationService();
    }
}
