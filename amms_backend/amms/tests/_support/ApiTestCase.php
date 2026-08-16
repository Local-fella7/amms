<?php

namespace Tests\Support;

use App\Database\Seeds\AmmsSeeder;
use App\Libraries\JwtService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

abstract class ApiTestCase extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = true;

    protected $migrateOnce = false;

    protected $refresh = true;

    protected $namespace = 'App';

    protected $DBGroup = 'tests';

    protected $seed = AmmsSeeder::class;

    protected function getAuthToken(): string
    {
        $jwt = new JwtService();
        return $jwt->encode(['sub' => 1, 'email' => 'admin@amms.local', 'role_id' => 1]);
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->getAuthToken()];
    }

    protected function jsonHeaders(): array
    {
        return array_merge($this->authHeaders(), ['Content-Type' => 'application/json']);
    }
}
