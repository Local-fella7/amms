<?php

namespace Tests\Unit\Services;

use App\Services\AuthService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use App\Database\Seeds\AmmsSeeder;

/**
 * @internal
 */
final class AuthServiceTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $migrate = true;
    protected $refresh = true;
    protected $namespace = 'App';
    protected $DBGroup = 'tests';
    protected $seed = AmmsSeeder::class;

    public function testLoginReturnsTokenForValidCredentials(): void
    {
        $service = new AuthService();
        $result = $service->login('admin@amms.local', 'admin123');
        $this->assertIsArray($result);
        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
        $this->assertArrayHasKey('requires_password_change', $result);
        $this->assertFalse($result['requires_password_change']);
        $this->assertArrayNotHasKey('password', $result['user']);
    }

    public function testChangePasswordUpdatesUserAndClearsForceFlag(): void
    {
        $userService = new \App\Services\UserService();
        $userService->create([
            'first_name' => 'Change',
            'last_name'  => 'Me',
            'email'      => 'change.me@amms.local',
            'role_id'    => 1,
        ]);

        $service = new AuthService();
        $login = $service->login('change.me@amms.local', \App\Services\UserService::DEFAULT_PASSWORD);
        $this->assertTrue($login['requires_password_change']);

        $updated = $service->changePassword(
            (int) $login['user']['id'],
            \App\Services\UserService::DEFAULT_PASSWORD,
            'newpassword123'
        );
        $this->assertIsArray($updated);
        $this->assertEquals(0, $updated['must_change_password']);
        $this->assertIsArray($service->login('change.me@amms.local', 'newpassword123'));
    }

    public function testChangePasswordFailsWithWrongCurrentPassword(): void
    {
        $service = new AuthService();
        $this->assertFalse($service->changePassword(1, 'wrongpassword', 'newpassword123'));
    }

    public function testLoginReturnsFalseForInvalidCredentials(): void
    {
        $service = new AuthService();
        $this->assertFalse($service->login('admin@amms.local', 'wrongpassword'));
    }

    public function testGetAuthenticatedUserReturnsUserWithoutPassword(): void
    {
        $service = new AuthService();
        $user = $service->getAuthenticatedUser(1);
        $this->assertIsArray($user);
        $this->assertArrayNotHasKey('password', $user);
        $this->assertEquals('admin@amms.local', $user['email']);
    }

    public function testGetAuthenticatedUserReturnsNullForMissing(): void
    {
        $service = new AuthService();
        $this->assertNull($service->getAuthenticatedUser(999999));
    }
}
