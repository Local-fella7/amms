<?php

namespace App\Controllers\Api;

use Config\ApiValidation;
use App\Services\BaseService;
use CodeIgniter\HTTP\ResponseInterface;

abstract class CrudApiController extends BaseApiController
{
    protected BaseService $service;

    protected string $validationKey = '';

    protected string $resourceLabel = 'Resource';

    public function initController($request, $response, $logger)
    {
        parent::initController($request, $response, $logger);
        $this->service = $this->initService();
    }

    abstract protected function initService(): BaseService;

    public function index()
    {
        return $this->success($this->service->getAll(), $this->resourceLabel . ' list retrieved');
    }

    public function show($id = null)
    {
        $record = $this->service->getById((int) $id);

        if ($record === null) {
            return $this->notFound($this->resourceLabel . ' not found');
        }

        return $this->success($record, $this->resourceLabel . ' retrieved');
    }

    public function create()
    {
        $validation = $this->validateRequest(ApiValidation::for($this->validationKey, 'create'));

        if ($validation instanceof ResponseInterface) {
            return $validation;
        }

        $record = $this->service->create($this->getJsonInput());

        if ($record === false) {
            return $this->error('Failed to create ' . strtolower($this->resourceLabel), 500);
        }

        return $this->created($record, $this->resourceLabel . ' created successfully');
    }

    public function update($id = null)
    {
        $validation = $this->validateRequest(ApiValidation::for($this->validationKey, 'update'));

        if ($validation instanceof ResponseInterface) {
            return $validation;
        }

        $record = $this->service->update((int) $id, $this->getJsonInput());

        if ($record === null) {
            return $this->notFound($this->resourceLabel . ' not found');
        }

        if ($record === false) {
            return $this->error('Failed to update ' . strtolower($this->resourceLabel), 500);
        }

        return $this->success($record, $this->resourceLabel . ' updated successfully');
    }

    public function delete($id = null)
    {
        if (! $this->service->delete((int) $id)) {
            return $this->notFound($this->resourceLabel . ' not found or could not be deleted');
        }

        return $this->success(null, $this->resourceLabel . ' deleted successfully');
    }
}
