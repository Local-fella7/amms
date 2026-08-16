<?php

namespace App\Controllers\Api;

use App\Services\AssociationService;
use App\Services\BaseService;

class AssociationController extends CrudApiController
{
    protected string $validationKey = 'association';
    protected string $resourceLabel = 'Association';

    protected function initService(): BaseService
    {
        return new AssociationService();
    }
}
