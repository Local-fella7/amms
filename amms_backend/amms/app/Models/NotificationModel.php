<?php

namespace App\Models;

class NotificationModel extends BaseModel
{
    protected $table = 'notifications';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'notification_template_id', 'content'];
}
