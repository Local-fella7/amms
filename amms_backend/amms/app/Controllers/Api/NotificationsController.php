<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\NotificationService;

class NotificationsController extends CrudApiController
{
    protected string $validationKey = 'notifications';
    protected string $resourceLabel = 'Notification';

    protected function initService(): BaseService
    {
        return new NotificationService();
    }
}
