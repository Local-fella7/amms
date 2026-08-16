<?php

namespace App\Services;

use App\Models\AssociationModel;

class AssociationService extends BaseService
{
    protected string $resourceName = 'association';

    public function __construct()
    {
        parent::__construct();
        $this->model = new AssociationModel();
    }
}
