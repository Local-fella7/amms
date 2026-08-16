<?php

namespace App\Services;

use App\Models\FeatureGroupModel;

class FeatureGroupService extends BaseService
{
    protected string $resourceName = 'feature_group';

    public function __construct()
    {
        parent::__construct();
        $this->model = new FeatureGroupModel();
    }
}
