<?php

namespace App\Filters;

use App\Libraries\JwtService;
use App\Models\UserModel;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class JwtAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');

        if (! preg_match('/Bearer\s(\S+)/', $header, $matches)) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Missing or invalid authorization token']);
        }

        try {
            $jwtService = new JwtService();
            $decoded = $jwtService->decode($matches[1]);
            $userId = (int) ($decoded->sub ?? 0);

            if ($userId <= 0) {
                throw new \Exception('Invalid token payload');
            }

            session()->set('auth_user_id', $userId);
            session()->set('auth_user_role_id', (int) ($decoded->role_id ?? 0));

            if ($this->mustChangePassword($request, $userId)) {
                return service('response')
                    ->setStatusCode(403)
                    ->setJSON([
                        'status'  => 'error',
                        'message' => 'Password change required before accessing this resource',
                        'code'    => 'PASSWORD_CHANGE_REQUIRED',
                    ]);
            }
        } catch (\Throwable $e) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Invalid or expired token']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }

    private function mustChangePassword(RequestInterface $request, int $userId): bool
    {
        $path = trim($request->getUri()->getPath(), '/');

        if (preg_match('#(?:^|/)api/auth/(change-password|me)$#', $path)) {
            return false;
        }

        $user = (new UserModel())->find($userId);

        return $user !== null && (int) ($user['must_change_password'] ?? 0) === 1;
    }
}
