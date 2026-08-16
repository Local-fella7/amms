<?php

namespace Tests\Unit\Services;

use App\Services\BaseService;
use App\Services\UserService;
use Tests\Support\ServiceTestCase;

/**
 * @internal
 */
final class UserServiceTest extends ServiceTestCase
{
    protected function makeService(): BaseService { return new UserService(); }
    protected function sampleCreateData(): array
    {
        return [
            'first_name' => 'Test', 'last_name' => 'User',
            'email' => 'testuser@amms.local', 'password' => 'password123', 'role_id' => 1,
        ];
    }
    protected function sampleUpdateData(): array { return ['first_name' => 'Updated']; }

    public function testCreateDoesNotExposePassword(): void
    {
        $created = $this->makeService()->create($this->sampleCreateData());
        $this->assertArrayNotHasKey('password', $created);
    }

    public function testCreateUsesDefaultPasswordAndRequiresChange(): void
    {
        $created = $this->makeService()->create([
            'first_name' => 'Default',
            'last_name'  => 'User',
            'email'      => 'default.user@amms.local',
            'role_id'    => 1,
        ]);

        $this->assertEquals(1, $created['must_change_password']);

        $auth = new \App\Services\AuthService();
        $this->assertIsArray($auth->login('default.user@amms.local', UserService::DEFAULT_PASSWORD));
    }
}
