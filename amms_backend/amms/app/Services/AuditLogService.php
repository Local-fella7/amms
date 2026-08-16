<?php

namespace App\Services;

use App\Models\LogModel;

class AuditLogService
{
    protected LogModel $logModel;

    public function __construct(?LogModel $logModel = null)
    {
        $this->logModel = $logModel ?? new LogModel();
    }

    public function logCreate(?int $featureId, ?array $after): void
    {
        $this->write($featureId, null, $after);
    }

    public function logUpdate(?int $featureId, ?array $before, ?array $after): void
    {
        $this->write($featureId, $before, $after);
    }

    public function logDelete(?int $featureId, ?array $before): void
    {
        $this->write($featureId, $before, null);
    }

    protected function write(?int $featureId, ?array $before, ?array $after): void
    {
        $userId = session('auth_user_id');

        $this->logModel->insert([
            'feature_id' => $featureId,
            'user_id'    => $userId,
            'datetime'   => date('Y-m-d H:i:s'),
            'before'     => $before !== null ? json_encode($before) : null,
            'after'      => $after !== null ? json_encode($after) : null,
        ]);
    }
}
