<?php

namespace App\Services;

use App\Models\FeatureModel;

class FeatureService extends BaseService
{
    protected string $resourceName = 'feature';

    public function __construct()
    {
        parent::__construct();
        $this->model = new FeatureModel();
    }

    public function getAll(): array
    {
        return $this->model
            ->select('features.*, features_group.name as features_group_name')
            ->join('features_group', 'features_group.id = features.features_group_id', 'left')
            ->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model
            ->select('features.*, features_group.name as features_group_name')
            ->join('features_group', 'features_group.id = features.features_group_id', 'left')
            ->where('features.id', $id)
            ->first();
    }
}
