<?php

namespace Tests\Unit\Services;

use App\Services\MemberPhotoService;
use CodeIgniter\HTTP\Files\UploadedFile;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class MemberPhotoServiceTest extends CIUnitTestCase
{
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'amms_photo_tests';

        if (! is_dir($this->tempDir)) {
            mkdir($this->tempDir, 0755, true);
        }
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tempDir . DIRECTORY_SEPARATOR . '*') ?: [] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }

        parent::tearDown();
    }

    public function testProcessUploadConvertsImageToWebp(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('WebP support is not available in GD.');
        }

        $source = $this->tempDir . DIRECTORY_SEPARATOR . 'source.jpg';
        $this->createSampleJpeg($source, 600, 400);

        $file = new UploadedFile($source, 'photo.jpg', 'image/jpeg', filesize($source), UPLOAD_ERR_OK);
        $service = new MemberPhotoService();

        $path = $service->processUpload($file);

        $this->assertIsString($path);
        $this->assertStringEndsWith('.webp', $path);

        $fullPath = FCPATH . $path;
        $this->assertFileExists($fullPath);
        $this->assertSame(IMAGETYPE_WEBP, exif_imagetype($fullPath));

        $service->delete($path);
    }

    public function testProcessUploadCropsAndResizesImage(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('WebP support is not available in GD.');
        }

        $source = $this->tempDir . DIRECTORY_SEPARATOR . 'crop.jpg';
        $this->createSampleJpeg($source, 800, 600);

        $file = new UploadedFile($source, 'photo.jpg', 'image/jpeg', filesize($source), UPLOAD_ERR_OK);
        $service = new MemberPhotoService();

        $path = $service->processUpload($file, [
            'x'      => 100,
            'y'      => 50,
            'width'  => 300,
            'height' => 300,
        ]);

        $this->assertIsString($path);

        $size = getimagesize(FCPATH . $path);
        $this->assertLessThanOrEqual(400, $size[0]);
        $this->assertLessThanOrEqual(400, $size[1]);

        $service->delete($path);
    }

    private function createSampleJpeg(string $path, int $width, int $height): void
    {
        $image = imagecreatetruecolor($width, $height);
        $color = imagecolorallocate($image, 40, 120, 200);
        imagefill($image, 0, 0, $color);
        imagejpeg($image, $path, 90);
        imagedestroy($image);
    }
}
