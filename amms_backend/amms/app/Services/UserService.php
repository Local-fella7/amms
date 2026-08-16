<?php

namespace App\Services;

use App\Models\UserModel;

class UserService extends BaseService
{
    public const DEFAULT_PASSWORD = '123456';

    protected string $resourceName = 'user';

    public function __construct()
    {
        parent::__construct();
        $this->model = new UserModel();
    }

    public function getAll(): array
    {
        $users = $this->model
            ->select('users.*, roles.name as role_name')
            ->join('roles', 'roles.id = users.role_id', 'left')
            ->findAll();

        return array_map(fn ($user) => $this->hideSensitiveFields($user), $users);
    }

    public function getById(int $id): ?array
    {
        $user = $this->model
            ->select('users.*, roles.name as role_name')
            ->join('roles', 'roles.id = users.role_id', 'left')
            ->where('users.id', $id)
            ->first();

        return $this->hideSensitiveFields($user);
    }

    public function create(array $data): array|false
    {
        $result = parent::create($data);

        return $result ? $this->hideSensitiveFields($result) : false;
    }

    public function update(int $id, array $data): array|false|null
    {
        $result = parent::update($id, $data);

        if ($result === null || $result === false) {
            return $result;
        }

        return $this->hideSensitiveFields($result);
    }

    protected function prepareData(array $data, bool $isUpdate = false): array
    {
        if (! $isUpdate) {
            if (empty($data['password'])) {
                $data['password'] = self::DEFAULT_PASSWORD;
                $data['must_change_password'] = 1;
            } else {
                $data['must_change_password'] = 0;
            }
        }

        return $data;
    }
}
