<?php

namespace App\Services;

use App\Models\RoleModel;

class RoleService extends BaseService
{
    protected string $resourceName = 'role';

    public function __construct()
    {
        parent::__construct();
        $this->model = new RoleModel();
    }
}
