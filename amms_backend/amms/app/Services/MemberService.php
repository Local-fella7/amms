<?php

namespace App\Services;

use App\Models\MemberModel;

class MemberService extends BaseService
{
    protected string $resourceName = 'member';

    protected MemberPhotoService $photoService;

    public function __construct()
    {
        parent::__construct();
        $this->model = new MemberModel();
        $this->photoService = new MemberPhotoService();
    }

    public function getAll(): array
    {
        return $this->model
            ->select('members.*, locations.name as location_name, age_groups.name as age_group_name')
            ->join('locations', 'locations.id = members.location_id', 'left')
            ->join('age_groups', 'age_groups.id = members.age_group_id', 'left')
            ->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model
            ->select('members.*, locations.name as location_name, age_groups.name as age_group_name')
            ->join('locations', 'locations.id = members.location_id', 'left')
            ->join('age_groups', 'age_groups.id = members.age_group_id', 'left')
            ->where('members.id', $id)
            ->first();
    }

    public function delete(int $id): bool
    {
        $existing = $this->getById($id);

        if ($existing === null) {
            return false;
        }

        $deleted = parent::delete($id);

        if ($deleted) {
            $this->photoService->delete($existing['picture'] ?? null);
        }

        return $deleted;
    }
}
