<?php

namespace App\Services;

use App\Models\LogModel;

class LogService extends BaseService
{
    protected string $resourceName = 'log';

    public function __construct()
    {
        parent::__construct();
        $this->model = new LogModel();
    }

    public function getAll(): array
    {
        return $this->model
            ->select('logs.*, features.name as feature_name, users.first_name as user_first_name, users.last_name as user_last_name')
            ->join('features', 'features.id = logs.feature_id', 'left')
            ->join('users', 'users.id = logs.user_id', 'left')
            ->orderBy('logs.datetime', 'DESC')
            ->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model
            ->select('logs.*, features.name as feature_name, users.first_name as user_first_name, users.last_name as user_last_name')
            ->join('features', 'features.id = logs.feature_id', 'left')
            ->join('users', 'users.id = logs.user_id', 'left')
            ->where('logs.id', $id)
            ->first();
    }
}
