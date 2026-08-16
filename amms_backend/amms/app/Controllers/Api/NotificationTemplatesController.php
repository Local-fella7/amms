<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\NotificationTemplateService;

class NotificationTemplatesController extends CrudApiController
{
    protected string $validationKey = 'notification_templates';
    protected string $resourceLabel = 'Notification template';

    protected function initService(): BaseService
    {
        return new NotificationTemplateService();
    }
}
