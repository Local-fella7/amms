<?php

namespace Tests\Feature\Api;

use Tests\Support\ApiTestCase;

/**
 * @internal
 */
final class MemberRegistrationApiTest extends ApiTestCase
{
    public function testCreateMemberRequiresGender(): void
    {
        $result = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/members', [
                'first_name' => 'No',
                'last_name'  => 'Gender',
                'location_id' => 1,
                'age_group_id' => 1,
            ]);

        $result->assertStatus(422);
    }

    public function testCreateMemberWithGenderAndDeceasedStatus(): void
    {
        $result = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/members', [
                'first_name'    => 'Mary',
                'last_name'     => 'Member',
                'gender'        => 'female',
                'member_status' => 'deceased',
                'location_id'   => 1,
                'age_group_id'  => 1,
            ]);

        $result->assertStatus(201);
        $json = json_decode($result->getJSON(), true);
        $this->assertEquals('female', $json['data']['gender']);
        $this->assertEquals('deceased', $json['data']['member_status']);
    }

    public function testCreateMemberWithPhotoUpload(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('WebP support is not available in GD.');
        }

        $source = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'member_upload_test.jpg';
        $image = imagecreatetruecolor(500, 500);
        imagejpeg($image, $source, 90);
        imagedestroy($image);

        $result = $this->withHeaders($this->authHeaders())
            ->post('api/members', [
                'first_name'   => 'Photo',
                'last_name'    => 'Member',
                'gender'       => 'male',
                'location_id'  => 1,
                'age_group_id' => 1,
                'photo'        => new \CodeIgniter\HTTP\Files\UploadedFile(
                    $source,
                    'member.jpg',
                    'image/jpeg',
                    filesize($source),
                    UPLOAD_ERR_OK
                ),
            ]);

        @unlink($source);

        $result->assertStatus(201);
        $json = json_decode($result->getJSON(), true);
        $this->assertStringContainsString('uploads/members/', $json['data']['picture']);
        $this->assertFileExists(FCPATH . $json['data']['picture']);

        if (isset($json['data']['picture'])) {
            (new \App\Services\MemberPhotoService())->delete($json['data']['picture']);
        }
    }
}
