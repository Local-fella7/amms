<?php

namespace App\Models;

class NotificationTemplateModel extends BaseModel
{
    protected $table = 'notification_templates';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'content'];
}
