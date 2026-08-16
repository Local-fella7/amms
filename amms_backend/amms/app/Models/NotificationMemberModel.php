<?php

namespace App\Models;

class NotificationMemberModel extends BaseModel
{
    protected $table = 'notifications_members';
    protected $primaryKey = 'id';
    protected $allowedFields = ['notification_id', 'member_id'];
}
