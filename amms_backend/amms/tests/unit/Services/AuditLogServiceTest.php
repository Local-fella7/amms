<?php

namespace Tests\Unit\Services;

use App\Services\AuditLogService;
use App\Models\LogModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use App\Database\Seeds\AmmsSeeder;

/**
 * @internal
 */
final class AuditLogServiceTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $migrate = true;
    protected $refresh = true;
    protected $namespace = 'App';
    protected $DBGroup = 'tests';
    protected $seed = AmmsSeeder::class;

    public function testLogCreateInsertsRecord(): void
    {
        session()->set('auth_user_id', 1);
        $service = new AuditLogService();
        $service->logCreate(1, ['name' => 'Test']);
        $log = (new LogModel())->orderBy('id', 'DESC')->first();
        $this->assertNotNull($log);
        $this->assertEquals(1, $log['user_id']);
        $this->assertNotNull($log['after']);
    }

    public function testLogUpdateInsertsRecord(): void
    {
        session()->set('auth_user_id', 1);
        $service = new AuditLogService();
        $service->logUpdate(1, ['name' => 'Before'], ['name' => 'After']);
        $log = (new LogModel())->orderBy('id', 'DESC')->first();
        $this->assertNotNull($log['before']);
        $this->assertNotNull($log['after']);
    }

    public function testLogDeleteInsertsRecord(): void
    {
        session()->set('auth_user_id', 1);
        $service = new AuditLogService();
        $service->logDelete(1, ['name' => 'Deleted']);
        $log = (new LogModel())->orderBy('id', 'DESC')->first();
        $this->assertNotNull($log['before']);
        $this->assertNull($log['after']);
    }
}
