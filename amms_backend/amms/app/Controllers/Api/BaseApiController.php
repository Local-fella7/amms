<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Traits\ApiResponseTrait;
use CodeIgniter\HTTP\ResponseInterface;

class BaseApiController extends BaseController
{
    use ApiResponseTrait;

    protected $format = 'json';

    protected function getJsonInput(): array
    {
        return $this->request->getJSON(true) ?? $this->request->getPost() ?? [];
    }

    protected function validateRequest(array $rules): bool|ResponseInterface
    {
        if (! $this->validate($rules)) {
            return $this->error('Validation failed', 422, $this->validator->getErrors());
        }

        return true;
    }
}
