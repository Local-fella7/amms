<?php

namespace Tests\Unit\Services;

use App\Services\PdfService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PdfServiceTest extends CIUnitTestCase
{
    public function testRenderProducesPdfBytes(): void
    {
        $service = new PdfService();
        $pdf = $service->render('<html><body><h1>Test Report</h1></body></html>');

        $this->assertNotEmpty($pdf);
        $this->assertStringStartsWith('%PDF', $pdf);
    }
}
