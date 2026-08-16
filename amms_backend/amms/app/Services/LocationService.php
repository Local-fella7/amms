<?php

namespace App\Services;

use App\Models\LocationModel;

class LocationService extends BaseService
{
    protected string $resourceName = 'location';

    public function __construct()
    {
        parent::__construct();
        $this->model = new LocationModel();
    }
}
