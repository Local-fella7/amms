<?php

namespace App\Services;

use App\Models\RoleFeatureModel;

class RoleFeatureService extends BaseService
{
    protected string $resourceName = 'role_feature';

    public function __construct()
    {
        parent::__construct();
        $this->model = new RoleFeatureModel();
    }

    public function getAll(): array
    {
        return $this->model
            ->select('roles_features.*, roles.name as role_name, features.name as feature_name')
            ->join('roles', 'roles.id = roles_features.role_id', 'left')
            ->join('features', 'features.id = roles_features.feature_id', 'left')
            ->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model
            ->select('roles_features.*, roles.name as role_name, features.name as feature_name')
            ->join('roles', 'roles.id = roles_features.role_id', 'left')
            ->join('features', 'features.id = roles_features.feature_id', 'left')
            ->where('roles_features.id', $id)
            ->first();
    }
}
