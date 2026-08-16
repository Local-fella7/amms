<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\UserService;

class UsersController extends CrudApiController
{
    protected string $validationKey = 'users';
    protected string $resourceLabel = 'User';

    protected function initService(): BaseService
    {
        return new UserService();
    }
}
