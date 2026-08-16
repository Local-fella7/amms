<?php

namespace Tests\Feature\Api;

use Tests\Support\ApiTestCase;

/**
 * @internal
 */
final class CrudApiTest extends ApiTestCase
{
    public static function resourceProvider(): array
    {
        return [
            'roles' => ['roles', ['name' => 'API Role'], ['name' => 'Updated API Role']],
            'feature-groups' => ['feature-groups', ['name' => 'API Group'], ['name' => 'Updated API Group']],
            'features' => ['features', ['name' => 'API Feature', 'features_group_id' => 1], ['name' => 'Updated API Feature']],
            'role-features' => ['role-features', ['role_id' => 2, 'feature_id' => 3], ['role_id' => 3]],
            'users' => ['users', [
                'first_name' => 'API', 'last_name' => 'User', 'email' => 'api.user@amms.local',
                'password' => 'password123', 'role_id' => 1,
            ], ['first_name' => 'UpdatedAPI']],
            'association' => ['association', ['name' => 'API Association'], ['name' => 'Updated API Association']],
            'age-groups' => ['age-groups', ['name' => 'API Age', 'from_age' => 20, 'to_age' => 30], ['name' => 'Updated API Age']],
            'notification-templates' => ['notification-templates', ['name' => 'API Template', 'content' => 'Hello'], ['name' => 'Updated Template']],
            'locations' => ['locations', ['name' => 'API Location'], ['name' => 'Updated Location']],
            'fees' => ['fees', ['name' => 'API Fee', 'amount' => 2500, 'year' => 2026], ['name' => 'Updated Fee']],
            'payment-modes' => ['payment-modes', ['name' => 'API Payment'], ['name' => 'Updated Payment']],
            'members' => ['members', [
                'first_name' => 'API', 'last_name' => 'Member', 'gender' => 'female',
                'location_id' => 1, 'age_group_id' => 1,
            ], ['first_name' => 'UpdatedMember', 'member_status' => 'deceased']],
            'fee-payments' => ['fee-payments', [
                'date' => '2026-02-01', 'payment_mode_id' => 1, 'amount' => 1000, 'fee_id' => 1, 'member_id' => 1,
            ], ['amount' => 1500]],
            'notifications' => ['notifications', ['name' => 'API Notice', 'content' => 'Message body'], ['name' => 'Updated Notice']],
            'logs' => ['logs', [
                'feature_id' => 1, 'user_id' => 1, 'datetime' => '2026-03-01 12:00:00',
                'before' => '{}', 'after' => '{"ok":true}',
            ], ['after' => '{"ok":false}']],
        ];
    }

    public static function updatableResourceProvider(): array
    {
        $resources = self::resourceProvider();
        unset($resources['fee-payments']);

        return $resources;
    }

    /**
     * @dataProvider resourceProvider
     */
    public function testIndexRequiresAuth(string $uri, array $create, array $update): void
    {
        $this->get("api/{$uri}")->assertStatus(401);
    }

    /**
     * @dataProvider resourceProvider
     */
    public function testIndexReturnsList(string $uri, array $create, array $update): void
    {
        $result = $this->withHeaders($this->authHeaders())->get("api/{$uri}");
        $result->assertStatus(200);
        $result->assertJSONFragment(['status' => 'success']);
    }

    /**
     * @dataProvider resourceProvider
     */
    public function testCreateReturnsCreated(string $uri, array $create, array $update): void
    {
        $result = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post("api/{$uri}", $create);
        $result->assertStatus(201);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('id', $json['data']);
    }

    /**
     * @dataProvider resourceProvider
     */
    public function testShowReturnsRecord(string $uri, array $create, array $update): void
    {
        $created = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post("api/{$uri}", $create);
        $id = json_decode($created->getJSON(), true)['data']['id'];
        $result = $this->withHeaders($this->authHeaders())->get("api/{$uri}/{$id}");
        $result->assertStatus(200);
    }

    /**
     * @dataProvider resourceProvider
     */
    public function testShowReturns404ForMissing(string $uri, array $create, array $update): void
    {
        $result = $this->withHeaders($this->authHeaders())->get("api/{$uri}/999999");
        $result->assertStatus(404);
    }

    /**
     * @dataProvider updatableResourceProvider
     */
    public function testUpdateModifiesRecord(string $uri, array $create, array $update): void
    {
        $created = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post("api/{$uri}", $create);
        $id = json_decode($created->getJSON(), true)['data']['id'];
        $result = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->put("api/{$uri}/{$id}", $update);
        $result->assertStatus(200);
    }

    public function testFeePaymentUpdateIsNotAllowed(): void
    {
        $created = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/fee-payments', [
                'date' => '2026-02-01', 'payment_mode_id' => 1, 'amount' => 1000, 'fee_id' => 1, 'member_id' => 1,
            ]);
        $id = json_decode($created->getJSON(), true)['data']['id'];

        $this->expectException(\CodeIgniter\Exceptions\PageNotFoundException::class);

        $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->put("api/fee-payments/{$id}", ['amount' => 1500]);
    }

    /**
     * @dataProvider resourceProvider
     */
    public function testDeleteRemovesRecord(string $uri, array $create, array $update): void
    {
        $created = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post("api/{$uri}", $create);
        $id = json_decode($created->getJSON(), true)['data']['id'];
        $result = $this->withHeaders($this->authHeaders())->delete("api/{$uri}/{$id}");
        $result->assertStatus(200);
        $this->withHeaders($this->authHeaders())->get("api/{$uri}/{$id}")->assertStatus(404);
    }

    public function testNotificationMembersCrud(): void
    {
        $notification = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/notifications', [
                'name' => 'Member Dispatch', 'content' => 'Hello',
            ]);
        $notificationId = json_decode($notification->getJSON(), true)['data']['id'];

        $payload = ['notification_id' => $notificationId, 'member_id' => 1];
        $created = $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->post('api/notification-members', $payload);
        $created->assertStatus(201);
        $id = json_decode($created->getJSON(), true)['data']['id'];

        $this->withHeaders($this->authHeaders())->get('api/notification-members/' . $id)->assertStatus(200);
        $this->withHeaders($this->jsonHeaders())
            ->withBodyFormat('json')
            ->put('api/notification-members/' . $id, ['member_id' => 1])
            ->assertStatus(200);
        $this->withHeaders($this->authHeaders())->delete('api/notification-members/' . $id)->assertStatus(200);
    }
}
