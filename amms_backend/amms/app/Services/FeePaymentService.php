<?php

namespace App\Services;

use App\Models\FeeModel;
use App\Models\FeePaymentModel;
use App\Models\MemberModel;

class FeePaymentService extends BaseService
{
    protected string $resourceName = 'fee_payment';

    protected FeeModel $feeModel;

    protected MemberModel $memberModel;

    public function __construct()
    {
        parent::__construct();
        $this->model = new FeePaymentModel();
        $this->feeModel = new FeeModel();
        $this->memberModel = new MemberModel();
    }

    public function getAll(): array
    {
        $payments = $this->model
            ->select('fee_payments.*, payment_modes.name as payment_mode_name, fee.name as fee_name, fee.amount as fee_amount, members.first_name as member_first_name, members.last_name as member_last_name')
            ->join('payment_modes', 'payment_modes.id = fee_payments.payment_mode_id', 'left')
            ->join('fee', 'fee.id = fee_payments.fee_id', 'left')
            ->join('members', 'members.id = fee_payments.member_id', 'left')
            ->findAll();

        return array_map(fn ($payment) => $this->appendBalance($payment), $payments);
    }

    public function getById(int $id): ?array
    {
        $payment = $this->model
            ->select('fee_payments.*, payment_modes.name as payment_mode_name, fee.name as fee_name, fee.amount as fee_amount, members.first_name as member_first_name, members.last_name as member_last_name')
            ->join('payment_modes', 'payment_modes.id = fee_payments.payment_mode_id', 'left')
            ->join('fee', 'fee.id = fee_payments.fee_id', 'left')
            ->join('members', 'members.id = fee_payments.member_id', 'left')
            ->where('fee_payments.id', $id)
            ->first();

        return $payment === null ? null : $this->appendBalance($payment);
    }

    public function create(array $data): array|false
    {
        $result = parent::create($data);

        return $result ? $this->appendBalance($result) : false;
    }

    public function getOutstanding(?int $memberId = null, ?int $feeId = null): array
    {
        $builder = db_connect()->table('members m');
        $builder
            ->select([
                'm.id as member_id',
                'm.first_name as member_first_name',
                'm.last_name as member_last_name',
                'm.fee_exemption',
                'f.id as fee_id',
                'f.name as fee_name',
                'f.amount as fee_amount',
                'f.year as fee_year',
                'COALESCE(SUM(fp.amount), 0) as total_paid',
            ])
            ->join('fee f', '1 = 1')
            ->join('fee_payments fp', 'fp.member_id = m.id AND fp.fee_id = f.id', 'left')
            ->groupBy('m.id, m.first_name, m.last_name, m.fee_exemption, f.id, f.name, f.amount, f.year');

        if ($memberId !== null) {
            $builder->where('m.id', $memberId);
        }

        if ($feeId !== null) {
            $builder->where('f.id', $feeId);
        }

        $rows = $builder->get()->getResultArray();

        return array_map(fn ($row) => $this->formatOutstandingRow($row), $rows);
    }

    public function memberExists(int $memberId): bool
    {
        return $this->memberModel->find($memberId) !== null;
    }

    public function feeExists(int $feeId): bool
    {
        return $this->feeModel->find($feeId) !== null;
    }

    public function appendBalance(array $payment): array
    {
        $memberId = (int) ($payment['member_id'] ?? 0);
        $feeId = (int) ($payment['fee_id'] ?? 0);

        if ($memberId <= 0 || $feeId <= 0) {
            return $payment;
        }

        $summary = $this->getBalanceSummary($memberId, $feeId, isset($payment['fee_amount']) ? (float) $payment['fee_amount'] : null);

        return array_merge($payment, $summary);
    }

    protected function getBalanceSummary(int $memberId, int $feeId, ?float $feeAmount = null): array
    {
        if ($feeAmount === null) {
            $fee = $this->feeModel->find($feeId);
            $feeAmount = $fee !== null ? (float) $fee['amount'] : 0.0;
        }

        $member = $this->memberModel->find($memberId);
        $totalPaid = $this->getTotalPaid($memberId, $feeId);
        $outstanding = $this->calculateOutstanding($feeAmount, $totalPaid, $member['fee_exemption'] ?? 'no');

        return [
            'fee_amount'  => round($feeAmount, 2),
            'total_paid'  => round($totalPaid, 2),
            'outstanding' => round($outstanding, 2),
        ];
    }

    protected function getTotalPaid(int $memberId, int $feeId): float
    {
        $result = $this->model
            ->selectSum('amount', 'total')
            ->where('member_id', $memberId)
            ->where('fee_id', $feeId)
            ->first();

        return (float) ($result['total'] ?? 0);
    }

    protected function calculateOutstanding(float $feeAmount, float $totalPaid, string $feeExemption = 'no'): float
    {
        if ($feeExemption === 'yes') {
            return 0.0;
        }

        return $feeAmount - $totalPaid;
    }

    protected function formatOutstandingRow(array $row): array
    {
        $feeAmount = (float) $row['fee_amount'];
        $totalPaid = (float) $row['total_paid'];
        $outstanding = $this->calculateOutstanding($feeAmount, $totalPaid, $row['fee_exemption'] ?? 'no');

        return [
            'member_id'          => (int) $row['member_id'],
            'member_first_name'  => $row['member_first_name'],
            'member_last_name'   => $row['member_last_name'],
            'fee_exemption'      => $row['fee_exemption'],
            'fee_id'             => (int) $row['fee_id'],
            'fee_name'           => $row['fee_name'],
            'fee_amount'         => round($feeAmount, 2),
            'fee_year'           => (int) $row['fee_year'],
            'total_paid'         => round($totalPaid, 2),
            'outstanding'        => round($outstanding, 2),
        ];
    }
}
