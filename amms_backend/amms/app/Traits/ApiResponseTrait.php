<?php

namespace App\Traits;

trait ApiResponseTrait
{
    protected function success(mixed $data = null, string $message = 'Success', int $status = 200)
    {
        return $this->response->setStatusCode($status)->setJSON([
            'status'  => 'success',
            'message' => $message,
            'data'    => $data,
        ]);
    }

    protected function created(mixed $data = null, string $message = 'Created successfully')
    {
        return $this->success($data, $message, 201);
    }

    protected function error(string $message, int $status = 400, mixed $errors = null)
    {
        $payload = [
            'status'  => 'error',
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return $this->response->setStatusCode($status)->setJSON($payload);
    }

    protected function notFound(string $message = 'Resource not found')
    {
        return $this->error($message, 404);
    }

    protected function unauthorized(string $message = 'Unauthorized')
    {
        return $this->error($message, 401);
    }

    protected function forbidden(string $message = 'Forbidden')
    {
        return $this->error($message, 403);
    }
}
