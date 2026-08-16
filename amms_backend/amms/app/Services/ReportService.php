<?php

namespace App\Services;

use App\Models\AssociationModel;
use App\Models\LogModel;

class ReportService
{
    protected PdfService $pdfService;

    protected MemberService $memberService;

    protected FeePaymentService $feePaymentService;

    protected AssociationModel $associationModel;

    protected LogModel $logModel;

    public function __construct(
        ?PdfService $pdfService = null,
        ?MemberService $memberService = null,
        ?FeePaymentService $feePaymentService = null,
        ?AssociationModel $associationModel = null,
        ?LogModel $logModel = null
    ) {
        $this->pdfService = $pdfService ?? new PdfService();
        $this->memberService = $memberService ?? new MemberService();
        $this->feePaymentService = $feePaymentService ?? new FeePaymentService();
        $this->associationModel = $associationModel ?? new AssociationModel();
        $this->logModel = $logModel ?? new LogModel();
    }

    public function generateOutstandingReport(?int $feeId = null): string
    {
        $rows = array_values(array_filter(
            $this->feePaymentService->getOutstanding(null, $feeId),
            static fn ($row) => (float) ($row['outstanding'] ?? 0) > 0
        ));

        return $this->pdfService->renderView('reports/outstanding', $this->baseViewData([
            'title'  => 'Outstanding Fees Report',
            'rows'   => $rows,
            'feeId'  => $feeId,
        ]));
    }

    public function generateMembersReport(): string
    {
        return $this->pdfService->renderView('reports/members', $this->baseViewData([
            'title'   => 'Members Report',
            'members' => $this->memberService->getAll(),
        ]));
    }

    public function generateAgeGroupReport(): string
    {
        return $this->pdfService->renderView('reports/age_groups', $this->baseViewData([
            'title'  => 'Age Group Report',
            'groups' => $this->groupMembersBy('age_group_name'),
        ]));
    }

    public function generateLocationsReport(): string
    {
        return $this->pdfService->renderView('reports/locations', $this->baseViewData([
            'title'     => 'Locations Report',
            'locations' => $this->groupMembersBy('location_name'),
        ]));
    }

    public function generateGenderReport(): string
    {
        return $this->pdfService->renderView('reports/gender', $this->baseViewData([
            'title'  => 'Gender Report',
            'groups' => $this->groupMembersBy('gender'),
        ]));
    }

    public function generateDeceasedReport(): string
    {
        $members = array_values(array_filter(
            $this->memberService->getAll(),
            static fn ($member) => ($member['member_status'] ?? '') === 'deceased'
        ));

        return $this->pdfService->renderView('reports/deceased', $this->baseViewData([
            'title'   => 'Deceased Members Report',
            'members' => $members,
        ]));
    }

    public function generateProfileReport(int $memberId): ?string
    {
        $member = $this->memberService->getById($memberId);

        if ($member === null) {
            return null;
        }

        $payments = $this->getFeePayments(['member_id' => $memberId]);

        return $this->pdfService->renderView('reports/profile', $this->baseViewData([
            'title'           => 'Member Profile Report',
            'member'          => $member,
            'payments'        => $payments,
            'showContacts'    => true,
            'photoPath'       => $this->resolvePhotoPath($member['picture'] ?? null),
        ]));
    }

    public function generateFeePaymentsReport(array $filters = []): string
    {
        return $this->pdfService->renderView('reports/fee_payments', $this->baseViewData([
            'title'    => 'Fee Payments Report',
            'rows'     => $this->getFeePayments($filters),
            'filters'  => $filters,
        ]));
    }

    public function generateMemberHistoryReport(int $memberId, ?string $from = null, ?string $to = null): ?string
    {
        $member = $this->memberService->getById($memberId);

        if ($member === null) {
            return null;
        }

        $filters = ['member_id' => $memberId];

        if ($from !== null && $from !== '') {
            $filters['from'] = $from;
        }

        if ($to !== null && $to !== '') {
            $filters['to'] = $to;
        }

        return $this->pdfService->renderView('reports/member_history', $this->baseViewData([
            'title'      => 'Member History Report',
            'member'     => $member,
            'payments'   => $this->getFeePayments($filters),
            'activities' => $this->getMemberAuditLogs($memberId, $from, $to),
            'from'       => $from,
            'to'         => $to,
        ]));
    }

    protected function baseViewData(array $data): array
    {
        return array_merge([
            'association' => $this->getAssociation(),
            'generatedAt' => date('Y-m-d H:i:s'),
            'showContacts' => false,
        ], $data);
    }

    protected function getAssociation(): ?array
    {
        return $this->associationModel->first();
    }

    protected function groupMembersBy(string $field): array
    {
        $members = $this->memberService->getAll();
        $groups = [];

        foreach ($members as $member) {
            $key = $member[$field] ?? 'Unassigned';
            $label = $key === '' || $key === null ? 'Unassigned' : (string) $key;

            if (! isset($groups[$label])) {
                $groups[$label] = [
                    'label'   => ucfirst($label),
                    'count'   => 0,
                    'members' => [],
                ];
            }

            $groups[$label]['count']++;
            $groups[$label]['members'][] = $member;
        }

        ksort($groups);

        return array_values($groups);
    }

    protected function getFeePayments(array $filters = []): array
    {
        $builder = db_connect()->table('fee_payments fp')
            ->select('fp.*, payment_modes.name as payment_mode_name, fee.name as fee_name, fee.amount as fee_amount, fee.year as fee_year, members.first_name as member_first_name, members.last_name as member_last_name')
            ->join('payment_modes', 'payment_modes.id = fp.payment_mode_id', 'left')
            ->join('fee', 'fee.id = fp.fee_id', 'left')
            ->join('members', 'members.id = fp.member_id', 'left')
            ->orderBy('fp.date', 'DESC')
            ->orderBy('fp.id', 'DESC');

        if (! empty($filters['member_id'])) {
            $builder->where('fp.member_id', (int) $filters['member_id']);
        }

        if (! empty($filters['fee_id'])) {
            $builder->where('fp.fee_id', (int) $filters['fee_id']);
        }

        if (! empty($filters['from'])) {
            $builder->where('fp.date >=', $filters['from']);
        }

        if (! empty($filters['to'])) {
            $builder->where('fp.date <=', $filters['to']);
        }

        return $builder->get()->getResultArray();
    }

    protected function getMemberAuditLogs(int $memberId, ?string $from = null, ?string $to = null): array
    {
        $builder = $this->logModel->builder()
            ->select('logs.*, features.name as feature_name, users.first_name as user_first_name, users.last_name as user_last_name')
            ->join('features', 'features.id = logs.feature_id', 'left')
            ->join('users', 'users.id = logs.user_id', 'left')
            ->orderBy('logs.datetime', 'DESC');

        if ($from !== null && $from !== '') {
            $builder->where('logs.datetime >=', $from . ' 00:00:00');
        }

        if ($to !== null && $to !== '') {
            $builder->where('logs.datetime <=', $to . ' 23:59:59');
        }

        $logs = $builder->get()->getResultArray();
        $entries = [];

        foreach ($logs as $log) {
            $matched = false;

            foreach (['before', 'after'] as $field) {
                if (empty($log[$field])) {
                    continue;
                }

                $payload = json_decode($log[$field], true);

                if (! is_array($payload) || ! isset($payload['id'], $payload['first_name'])) {
                    continue;
                }

                if ((int) $payload['id'] !== $memberId) {
                    continue;
                }

                $matched = true;
                break;
            }

            if ($matched) {
                $entries[] = $log;
            }
        }

        return $entries;
    }

    protected function resolvePhotoPath(?string $relativePath): ?string
    {
        if ($relativePath === null || $relativePath === '') {
            return null;
        }

        $fullPath = FCPATH . ltrim(str_replace(['../', '..\\'], '', $relativePath), '/\\');

        if (! is_file($fullPath)) {
            return null;
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        if (! in_array($extension, ['jpg', 'jpeg', 'png', 'gif'], true)) {
            return null;
        }

        return $fullPath;
    }
}
