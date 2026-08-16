<?php

namespace App\Services;

use App\Libraries\JwtService;
use App\Models\UserModel;

class AuthService
{
    protected UserModel $userModel;

    protected JwtService $jwtService;

    public function __construct(?UserModel $userModel = null, ?JwtService $jwtService = null)
    {
        $this->userModel = $userModel ?? new UserModel();
        $this->jwtService = $jwtService ?? new JwtService();
    }

    public function login(string $email, string $password): array|false
    {
        $user = $this->userModel->findByEmail($email);

        if ($user === null || ! password_verify($password, $user['password'])) {
            return false;
        }

        if ($user['status'] !== 'active') {
            return false;
        }

        $token = $this->jwtService->encode([
            'sub'     => $user['id'],
            'email'   => $user['email'],
            'role_id' => $user['role_id'],
        ]);

        unset($user['password']);

        return [
            'token'                    => $token,
            'user'                     => $user,
            'requires_password_change' => (bool) ($user['must_change_password'] ?? false),
        ];
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): array|false|null
    {
        $user = $this->userModel->find($userId);

        if ($user === null) {
            return null;
        }

        if (! password_verify($currentPassword, $user['password'])) {
            return false;
        }

        if ($currentPassword === $newPassword) {
            return false;
        }

        $this->userModel->update($userId, [
            'password'             => $newPassword,
            'must_change_password' => 0,
        ]);

        return $this->getAuthenticatedUser($userId);
    }

    public function getAuthenticatedUser(int $userId): ?array
    {
        $user = $this->userModel->find($userId);

        if ($user === null) {
            return null;
        }

        unset($user['password']);

        return $user;
    }
}
