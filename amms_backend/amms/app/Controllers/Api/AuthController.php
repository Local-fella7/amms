<?php

namespace App\Controllers\Api;

use Config\ApiValidation;
use App\Services\AuthService;
use CodeIgniter\HTTP\ResponseInterface;

class AuthController extends BaseApiController
{
    protected AuthService $authService;

    public function initController($request, $response, $logger)
    {
        parent::initController($request, $response, $logger);
        $this->authService = new AuthService();
    }

    public function login()
    {
        $validation = $this->validateRequest(ApiValidation::for('auth', 'login'));

        if ($validation instanceof ResponseInterface) {
            return $validation;
        }

        $input = $this->getJsonInput();
        $result = $this->authService->login($input['email'], $input['password']);

        if ($result === false) {
            return $this->error('Invalid credentials or inactive account', 401);
        }

        return $this->success($result, 'Login successful');
    }

    public function me()
    {
        $userId = (int) session('auth_user_id');

        if ($userId <= 0) {
            return $this->unauthorized();
        }

        $user = $this->authService->getAuthenticatedUser($userId);

        if ($user === null) {
            return $this->notFound('User not found');
        }

        return $this->success($user, 'Authenticated user retrieved');
    }

    public function changePassword()
    {
        $validation = $this->validateRequest(ApiValidation::for('auth', 'change_password'));

        if ($validation instanceof ResponseInterface) {
            return $validation;
        }

        $userId = (int) session('auth_user_id');

        if ($userId <= 0) {
            return $this->unauthorized();
        }

        $input = $this->getJsonInput();
        $result = $this->authService->changePassword(
            $userId,
            $input['current_password'],
            $input['new_password']
        );

        if ($result === null) {
            return $this->notFound('User not found');
        }

        if ($result === false) {
            return $this->error('Current password is incorrect or new password must differ', 400);
        }

        return $this->success($result, 'Password changed successfully');
    }
}
