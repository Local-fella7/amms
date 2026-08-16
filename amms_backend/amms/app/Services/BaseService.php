<?php

namespace App\Services;

use App\Models\BaseModel;
use App\Services\AuditLogService;

abstract class BaseService
{
    protected BaseModel $model;

    protected string $resourceName = 'resource';

    protected ?int $featureId = null;

    protected AuditLogService $auditLog;

    public function __construct()
    {
        $this->auditLog = new AuditLogService();
    }

    public function getAll(): array
    {
        return $this->model->findAll();
    }

    public function getById(int $id): ?array
    {
        return $this->model->find($id);
    }

    public function create(array $data): array|false
    {
        $data = $this->prepareData($data);

        if (! $this->model->insert($data)) {
            return false;
        }

        $record = $this->model->find($this->model->getInsertID());
        $this->auditLog->logCreate($this->featureId, $record);

        return $record;
    }

    public function update(int $id, array $data): array|false|null
    {
        $existing = $this->model->find($id);

        if ($existing === null) {
            return null;
        }

        $data = $this->prepareData($data, true);

        if (! $this->model->update($id, $data)) {
            return false;
        }

        $updated = $this->model->find($id);
        $this->auditLog->logUpdate($this->featureId, $existing, $updated);

        return $updated;
    }

    public function delete(int $id): bool
    {
        $existing = $this->model->find($id);

        if ($existing === null) {
            return false;
        }

        $deleted = $this->model->delete($id);

        if ($deleted) {
            $this->auditLog->logDelete($this->featureId, $existing);
        }

        return $deleted;
    }

    protected function prepareData(array $data, bool $isUpdate = false): array
    {
        return $data;
    }

    protected function hideSensitiveFields(?array $record): ?array
    {
        if ($record === null) {
            return null;
        }

        unset($record['password']);

        return $record;
    }
}
