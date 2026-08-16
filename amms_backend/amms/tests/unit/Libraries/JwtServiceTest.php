<?php

namespace Tests\Unit\Libraries;

use App\Libraries\JwtService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class JwtServiceTest extends CIUnitTestCase
{
    public function testEncodeReturnsString(): void
    {
        $jwt = new JwtService();
        $token = $jwt->encode(['sub' => 1, 'email' => 'test@example.com']);
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    public function testDecodeReturnsPayload(): void
    {
        $jwt = new JwtService();
        $token = $jwt->encode(['sub' => 42, 'email' => 'test@example.com', 'role_id' => 1]);
        $decoded = $jwt->decode($token);
        $this->assertEquals(42, $decoded->sub);
        $this->assertEquals('test@example.com', $decoded->email);
    }

    public function testDecodeThrowsOnInvalidToken(): void
    {
        $this->expectException(\Throwable::class);
        $jwt = new JwtService();
        $jwt->decode('invalid.token.here');
    }
}
