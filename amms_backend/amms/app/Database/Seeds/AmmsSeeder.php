<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class AmmsSeeder extends Seeder
{
    public function run()
    {
        // Roles
        $this->db->table('roles')->insertBatch([
            ['name' => 'Admin', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Secretary', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Treasurer', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
        ]);

        // Feature groups
        $this->db->table('features_group')->insertBatch([
            ['name' => 'User Management', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Membership', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Finance', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Notifications', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'System', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
        ]);

        // Features
        $features = [
            ['name' => 'Manage Users', 'features_group_id' => 1],
            ['name' => 'Manage Roles', 'features_group_id' => 1],
            ['name' => 'Manage Members', 'features_group_id' => 2],
            ['name' => 'Manage Age Groups', 'features_group_id' => 2],
            ['name' => 'Manage Locations', 'features_group_id' => 2],
            ['name' => 'Manage Fees', 'features_group_id' => 3],
            ['name' => 'Manage Payments', 'features_group_id' => 3],
            ['name' => 'Manage Notifications', 'features_group_id' => 4],
            ['name' => 'View Audit Logs', 'features_group_id' => 5],
        ];

        foreach ($features as &$feature) {
            $feature['created_at'] = date('Y-m-d H:i:s');
            $feature['updated_at'] = date('Y-m-d H:i:s');
        }

        $this->db->table('features')->insertBatch($features);

        // Admin gets all features
        $roleFeatures = [];

        for ($i = 1; $i <= 9; $i++) {
            $roleFeatures[] = [
                'role_id'    => 1,
                'feature_id' => $i,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
        }

        $this->db->table('roles_features')->insertBatch($roleFeatures);

        // Admin user (password: admin123)
        $this->db->table('users')->insert([
            'first_name'           => 'System',
            'last_name'            => 'Admin',
            'email'                => 'admin@amms.local',
            'phone'                => '255700000000',
            'password'             => password_hash('admin123', PASSWORD_DEFAULT),
            'must_change_password' => 0,
            'role_id'              => 1,
            'status'               => 'active',
            'created_at'           => date('Y-m-d H:i:s'),
            'updated_at'           => date('Y-m-d H:i:s'),
        ]);

        // Association
        $this->db->table('association')->insert([
            'name'            => 'Sample Association',
            'address'         => 'Arusha, Tanzania',
            'chairman_phone'  => '255711111111',
            'secretary_phone' => '255722222222',
            'treasurer_phone' => '255733333333',
            'logo'            => null,
            'created_at'      => date('Y-m-d H:i:s'),
            'updated_at'      => date('Y-m-d H:i:s'),
        ]);

        // Age groups
        $this->db->table('age_groups')->insertBatch([
            ['name' => 'Youth', 'from_age' => 0, 'to_age' => 17, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Adult', 'from_age' => 18, 'to_age' => 59, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Senior', 'from_age' => 60, 'to_age' => 120, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
        ]);

        // Notification templates
        $this->db->table('notification_templates')->insert([
            'name'       => 'Welcome Message',
            'content'    => 'Welcome {{first_name}} to our association!',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        // Locations
        $this->db->table('locations')->insertBatch([
            ['name' => 'Arusha City', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Meru District', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
        ]);

        // Fees
        $this->db->table('fee')->insert([
            'name'       => 'Annual Subscription 2026',
            'amount'     => 50000.00,
            'year'       => 2026,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        // Payment modes
        $this->db->table('payment_modes')->insertBatch([
            ['name' => 'Cash', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Mobile Money', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ['name' => 'Bank Transfer', 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
        ]);

        // Sample member
        $this->db->table('members')->insert([
            'first_name'        => 'John',
            'last_name'         => 'Doe',
            'gender'            => 'male',
            'fathers_name'      => 'James Doe',
            'mothers_name'      => 'Jane Doe',
            'location_id'       => 1,
            'picture'           => null,
            'date_of_birth'     => '1990-05-15',
            'member_status'     => 'active',
            'marital_status'    => 'married',
            'phone'             => '255744444444',
            'fee_exemption'     => 'no',
            'age_group_id'      => 2,
            'registration_date' => date('Y-m-d'),
            'created_at'        => date('Y-m-d H:i:s'),
            'updated_at'        => date('Y-m-d H:i:s'),
        ]);
    }
}
