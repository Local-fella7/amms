<?php

namespace App\Services;

use App\Models\AgeGroupModel;

class AgeGroupService extends BaseService
{
    protected string $resourceName = 'age_group';

    public function __construct()
    {
        parent::__construct();
        $this->model = new AgeGroupModel();
    }
}
