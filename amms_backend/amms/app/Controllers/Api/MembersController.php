<?php

namespace App\Controllers\Api;

use App\Services\BaseService;
use App\Services\MemberPhotoService;
use App\Services\MemberService;
use Config\ApiValidation;
use CodeIgniter\HTTP\ResponseInterface;

class MembersController extends CrudApiController
{
    protected string $validationKey = 'members';

    protected string $resourceLabel = 'Member';

    protected MemberPhotoService $photoService;

    public function initController($request, $response, $logger)
    {
        parent::initController($request, $response, $logger);
        $this->photoService = new MemberPhotoService();
    }

    protected function initService(): BaseService
    {
        return new MemberService();
    }

    public function create()
    {
        $validation = $this->validateRequest(array_merge(
            ApiValidation::for('members', 'create'),
            ApiValidation::for('members', 'photo')
        ));

        if ($validation instanceof ResponseInterface) {
            return $validation;
        }

        $data = $this->getMemberInput();
        $photoError = $this->handlePhotoUpload($data);

        if ($photoError instanceof ResponseInterface) {
            return $photoError;
        }

        $record = $this->service->create($data);

        if ($record === false) {
            $this->photoService->delete($data['picture'] ?? null);

            return $this->error('Failed to create member', 500);
        }

        return $this->created($record, 'Member created successfully');
    }

    public function update($id = null)
    {
        $validation = $this->validateRequest(array_merge(
            ApiValidation::for('members', 'update'),
            ApiValidation::for('members', 'photo')
        ));

        if ($validation instanceof ResponseInterface) {
            return $validation;
        }

        $existing = $this->service->getById((int) $id);

        if ($existing === null) {
            return $this->notFound('Member not found');
        }

        $data = $this->getMemberInput();
        $photoError = $this->handlePhotoUpload($data);

        if ($photoError instanceof ResponseInterface) {
            return $photoError;
        }

        $record = $this->service->update((int) $id, $data);

        if ($record === null) {
            return $this->notFound('Member not found');
        }

        if ($record === false) {
            if (isset($data['picture']) && $data['picture'] !== ($existing['picture'] ?? null)) {
                $this->photoService->delete($data['picture']);
            }

            return $this->error('Failed to update member', 500);
        }

        if (isset($data['picture']) && $data['picture'] !== ($existing['picture'] ?? null)) {
            $this->photoService->delete($existing['picture'] ?? null);
        }

        return $this->success($record, 'Member updated successfully');
    }

    protected function getMemberInput(): array
    {
        $input = $this->request->getPost();

        if ($input === null || $input === []) {
            $json = $this->request->getJSON(true);
            $input = is_array($json) ? $json : [];
        }

        unset(
            $input['photo'],
            $input['crop_x'],
            $input['crop_y'],
            $input['crop_width'],
            $input['crop_height']
        );

        return $input;
    }

    protected function handlePhotoUpload(array &$data): ?ResponseInterface
    {
        $file = $this->request->getFile('photo');

        if ($file === null || $file->getError() === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if (! $file->isValid()) {
            return $this->error('Invalid photo upload', 422);
        }

        $crop = [
            'x'      => $this->request->getPost('crop_x') ?? $this->request->getVar('crop_x'),
            'y'      => $this->request->getPost('crop_y') ?? $this->request->getVar('crop_y'),
            'width'  => $this->request->getPost('crop_width') ?? $this->request->getVar('crop_width'),
            'height' => $this->request->getPost('crop_height') ?? $this->request->getVar('crop_height'),
        ];

        $path = $this->photoService->processUpload($file, $crop);

        if ($path === false) {
            return $this->error('Failed to process member photo. Ensure GD with WebP support is enabled.', 422);
        }

        $data['picture'] = $path;

        return null;
    }
}
