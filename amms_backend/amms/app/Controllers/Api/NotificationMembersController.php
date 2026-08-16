<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\NotificationMemberService;

class NotificationMembersController extends CrudApiController
{
    protected string $validationKey = 'notifications_members';
    protected string $resourceLabel = 'Notification member';

    protected function initService(): BaseService
    {
        return new NotificationMemberService();
    }
}
