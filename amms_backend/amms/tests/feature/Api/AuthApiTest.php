<?php

namespace Tests\Feature\Api;

use Tests\Support\ApiTestCase;

/**
 * @internal
 */
final class AuthApiTest extends ApiTestCase
{
    public function testLoginReturnsToken(): void
    {
        $result = $this->post('api/auth/login', [
            'email'    => 'admin@amms.local',
            'password' => 'admin123',
        ]);
        $result->assertStatus(200);
        $result->assertJSONFragment(['status' => 'success']);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('token', $json['data']);
    }

    public function testLoginFailsWithInvalidCredentials(): void
    {
        $result = $this->post('api/auth/login', [
            'email'    => 'admin@amms.local',
            'password' => 'wrong',
        ]);
        $result->assertStatus(401);
    }

    public function testLoginValidationFailsWithoutEmail(): void
    {
        $result = $this->post('api/auth/login', ['password' => 'admin123']);
        $result->assertStatus(422);
    }

    public function testMeRequiresAuthentication(): void
    {
        $result = $this->get('api/auth/me');
        $result->assertStatus(401);
    }

    public function testMeReturnsAuthenticatedUser(): void
    {
        $result = $this->withHeaders($this->authHeaders())->get('api/auth/me');
        $result->assertStatus(200);
        $json = json_decode($result->getJSON(), true);
        $this->assertEquals('admin@amms.local', $json['data']['email']);
    }

    public function testChangePasswordRequiresAuthentication(): void
    {
        $result = $this->withHeaders(['Content-Type' => 'application/json'])->post('api/auth/change-password', [
            'current_password' => 'admin123',
            'new_password'     => 'newpassword123',
        ]);
        $result->assertStatus(401);
    }

    public function testUserWithDefaultPasswordIsBlockedUntilChanged(): void
    {
        $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/users', [
                'first_name' => 'Temp',
                'last_name'  => 'User',
                'email'      => 'temp.user@amms.local',
                'role_id'    => 1,
            ])->assertStatus(201);

        $login = $this->withBodyFormat('json')->post('api/auth/login', [
            'email'    => 'temp.user@amms.local',
            'password' => '123456',
        ]);
        $login->assertStatus(200);
        $json = json_decode($login->getJSON(), true);
        $this->assertTrue($json['data']['requires_password_change']);

        $token = $json['data']['token'];
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Content-Type'  => 'application/json',
        ];

        $this->withHeaders($headers)->get('api/roles')->assertStatus(403);

        $this->withHeaders($headers)
            ->withBodyFormat('json')
            ->post('api/auth/change-password', [
                'current_password' => '123456',
                'new_password'     => 'securepass123',
            ])->assertStatus(200);

        $this->withHeaders($headers)->get('api/roles')->assertStatus(200);
    }
}
