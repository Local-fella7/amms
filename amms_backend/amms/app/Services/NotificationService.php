<?php

namespace App\Services;

use App\Models\NotificationModel;

class NotificationService extends BaseService
{
    protected string $resourceName = 'notification';

    public function __construct()
    {
        parent::__construct();
        $this->model = new NotificationModel();
    }

    public function getAll(): array
    {
        return $this->model
            ->select('notifications.*, notification_templates.name as template_name')
            ->join('notification_templates', 'notification_templates.id = notifications.notification_template_id', 'left')
            ->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model
            ->select('notifications.*, notification_templates.name as template_name')
            ->join('notification_templates', 'notification_templates.id = notifications.notification_template_id', 'left')
            ->where('notifications.id', $id)
            ->first();
    }
}
