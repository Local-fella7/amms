<?php

namespace App\Services;

use CodeIgniter\HTTP\Files\UploadedFile;
use CodeIgniter\Images\Exceptions\ImageException;

class MemberPhotoService
{
    private const UPLOAD_DIR = 'uploads/members';

    private const MAX_WIDTH = 400;

    private const MAX_HEIGHT = 400;

    private const WEBP_QUALITY = 85;

    public function processUpload(UploadedFile $file, ?array $crop = null): string|false
    {
        if (! function_exists('imagewebp')) {
            return false;
        }

        $uploadDir = FCPATH . self::UPLOAD_DIR;

        if (! is_dir($uploadDir) && ! mkdir($uploadDir, 0755, true) && ! is_dir($uploadDir)) {
            return false;
        }

        $filename = uniqid('member_', true) . '.webp';
        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;

        try {
            $image = \Config\Services::image()->withFile($file->getTempName());

            if ($this->hasCrop($crop)) {
                $image->crop(
                    (int) $crop['width'],
                    (int) $crop['height'],
                    (int) $crop['x'],
                    (int) $crop['y']
                );
            }

            $image->resize(self::MAX_WIDTH, self::MAX_HEIGHT, true, 'auto')
                ->convert(IMAGETYPE_WEBP)
                ->save($targetPath, self::WEBP_QUALITY);

            return self::UPLOAD_DIR . '/' . $filename;
        } catch (ImageException) {
            if (is_file($targetPath)) {
                unlink($targetPath);
            }

            return false;
        }
    }

    public function delete(?string $relativePath): void
    {
        if ($relativePath === null || $relativePath === '') {
            return;
        }

        $fullPath = FCPATH . ltrim(str_replace(['../', '..\\'], '', $relativePath), '/\\');

        if (is_file($fullPath)) {
            unlink($fullPath);
        }
    }

    private function hasCrop(?array $crop): bool
    {
        if ($crop === null) {
            return false;
        }

        foreach (['x', 'y', 'width', 'height'] as $key) {
            if (! isset($crop[$key]) || $crop[$key] === '' || $crop[$key] === null) {
                return false;
            }
        }

        return (int) $crop['width'] > 0 && (int) $crop['height'] > 0;
    }
}
