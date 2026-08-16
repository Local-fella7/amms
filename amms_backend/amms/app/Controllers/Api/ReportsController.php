<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\ReportService;
use CodeIgniter\HTTP\ResponseInterface;

class ReportsController extends BaseController
{
    protected ReportService $reportService;

    public function initController($request, $response, $logger)
    {
        parent::initController($request, $response, $logger);
        $this->reportService = new ReportService();
    }

    public function outstanding()
    {
        $feeId = $this->request->getGet('fee_id');
        $feeId = $feeId !== null && $feeId !== '' ? (int) $feeId : null;

        return $this->pdfResponse(
            'outstanding-report.pdf',
            $this->reportService->generateOutstandingReport($feeId)
        );
    }

    public function members()
    {
        return $this->pdfResponse(
            'members-report.pdf',
            $this->reportService->generateMembersReport()
        );
    }

    public function ageGroups()
    {
        return $this->pdfResponse(
            'age-groups-report.pdf',
            $this->reportService->generateAgeGroupReport()
        );
    }

    public function locations()
    {
        return $this->pdfResponse(
            'locations-report.pdf',
            $this->reportService->generateLocationsReport()
        );
    }

    public function gender()
    {
        return $this->pdfResponse(
            'gender-report.pdf',
            $this->reportService->generateGenderReport()
        );
    }

    public function deceased()
    {
        return $this->pdfResponse(
            'deceased-members-report.pdf',
            $this->reportService->generateDeceasedReport()
        );
    }

    public function profile($memberId = null)
    {
        $pdf = $this->reportService->generateProfileReport((int) $memberId);

        if ($pdf === null) {
            return $this->response
                ->setStatusCode(404)
                ->setJSON(['status' => 'error', 'message' => 'Member not found']);
        }

        return $this->pdfResponse('member-profile-' . (int) $memberId . '.pdf', $pdf);
    }

    public function feePayments()
    {
        $filters = array_filter([
            'member_id' => $this->request->getGet('member_id'),
            'fee_id'    => $this->request->getGet('fee_id'),
            'from'      => $this->request->getGet('from'),
            'to'        => $this->request->getGet('to'),
        ], static fn ($value) => $value !== null && $value !== '');

        return $this->pdfResponse(
            'fee-payments-report.pdf',
            $this->reportService->generateFeePaymentsReport($filters)
        );
    }

    public function memberHistory($memberId = null)
    {
        $memberId = $memberId ?? $this->request->getGet('member_id');

        if ($memberId === null || (int) $memberId <= 0) {
            return $this->response
                ->setStatusCode(422)
                ->setJSON(['status' => 'error', 'message' => 'Member ID is required']);
        }

        $pdf = $this->reportService->generateMemberHistoryReport(
            (int) $memberId,
            $this->request->getGet('from'),
            $this->request->getGet('to')
        );

        if ($pdf === null) {
            return $this->response
                ->setStatusCode(404)
                ->setJSON(['status' => 'error', 'message' => 'Member not found']);
        }

        return $this->pdfResponse('member-history-' . (int) $memberId . '.pdf', $pdf);
    }

    protected function pdfResponse(string $filename, string $pdfBinary): ResponseInterface
    {
        $download = $this->request->getGet('download') === '1';
        $disposition = ($download ? 'attachment' : 'inline') . '; filename="' . $filename . '"';

        return $this->response
            ->setHeader('Content-Type', 'application/pdf')
            ->setHeader('Content-Disposition', $disposition)
            ->setBody($pdfBinary);
    }
}
