<?php

namespace App\Services;

use App\Models\NotificationTemplateModel;

class NotificationTemplateService extends BaseService
{
    protected string $resourceName = 'notification_template';

    public function __construct()
    {
        parent::__construct();
        $this->model = new NotificationTemplateModel();
    }
}
