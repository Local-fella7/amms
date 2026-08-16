<?php

namespace Tests\Support;

use App\Database\Seeds\AmmsSeeder;
use App\Services\BaseService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

abstract class ServiceTestCase extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $migrate = true;

    protected $refresh = true;

    protected $namespace = 'App';

    protected $DBGroup = 'tests';

    protected $seed = AmmsSeeder::class;

    abstract protected function makeService(): BaseService;

    abstract protected function sampleCreateData(): array;

    abstract protected function sampleUpdateData(): array;

    public function testGetAllReturnsArray(): void
    {
        $service = $this->makeService();
        $this->assertIsArray($service->getAll());
    }

    public function testGetByIdReturnsRecord(): void
    {
        $service = $this->makeService();
        $created = $service->create($this->sampleCreateData());
        $this->assertIsArray($created);
        $found = $service->getById((int) $created['id']);
        $this->assertIsArray($found);
        $this->assertEquals($created['id'], $found['id']);
    }

    public function testGetByIdReturnsNullForMissing(): void
    {
        $service = $this->makeService();
        $this->assertNull($service->getById(999999));
    }

    public function testCreateInsertsRecord(): void
    {
        $service = $this->makeService();
        $created = $service->create($this->sampleCreateData());
        $this->assertIsArray($created);
        $this->assertArrayHasKey('id', $created);
    }

    public function testUpdateModifiesRecord(): void
    {
        $service = $this->makeService();
        $created = $service->create($this->sampleCreateData());
        $updated = $service->update((int) $created['id'], $this->sampleUpdateData());
        $this->assertIsArray($updated);
        foreach ($this->sampleUpdateData() as $key => $value) {
            $this->assertEquals($value, $updated[$key]);
        }
    }

    public function testUpdateReturnsNullForMissing(): void
    {
        $service = $this->makeService();
        $this->assertNull($service->update(999999, $this->sampleUpdateData()));
    }

    public function testDeleteRemovesRecord(): void
    {
        $service = $this->makeService();
        $created = $service->create($this->sampleCreateData());
        $this->assertTrue($service->delete((int) $created['id']));
        $this->assertNull($service->getById((int) $created['id']));
    }

    public function testDeleteReturnsFalseForMissing(): void
    {
        $service = $this->makeService();
        $this->assertFalse($service->delete(999999));
    }
}
