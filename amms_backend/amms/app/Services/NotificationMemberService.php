<?php

namespace App\Services;

use App\Models\NotificationMemberModel;

class NotificationMemberService extends BaseService
{
    protected string $resourceName = 'notification_member';

    public function __construct()
    {
        parent::__construct();
        $this->model = new NotificationMemberModel();
    }

    public function getAll(): array
    {
        return $this->model
            ->select('notifications_members.*, notifications.name as notification_name, members.first_name as member_first_name, members.last_name as member_last_name')
            ->join('notifications', 'notifications.id = notifications_members.notification_id', 'left')
            ->join('members', 'members.id = notifications_members.member_id', 'left')
            ->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model
            ->select('notifications_members.*, notifications.name as notification_name, members.first_name as member_first_name, members.last_name as member_last_name')
            ->join('notifications', 'notifications.id = notifications_members.notification_id', 'left')
            ->join('members', 'members.id = notifications_members.member_id', 'left')
            ->where('notifications_members.id', $id)
            ->first();
    }
}
