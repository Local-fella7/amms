<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAmmsSchema extends Migration
{
    public function up()
    {
        // 04 roles
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('roles', true);

        // 03 features_group
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('features_group', true);

        // 02 features
        $this->forge->addField([
            'id'                => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'              => ['type' => 'VARCHAR', 'constraint' => 150],
            'features_group_id' => ['type' => 'INT', 'unsigned' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('features_group_id', 'features_group', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->createTable('features', true);

        // 05 roles_features
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'role_id'    => ['type' => 'INT', 'unsigned' => true],
            'feature_id' => ['type' => 'INT', 'unsigned' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['role_id', 'feature_id']);
        $this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('feature_id', 'features', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('roles_features', true);

        // 01 users
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'first_name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'last_name'  => ['type' => 'VARCHAR', 'constraint' => 100],
            'email'      => ['type' => 'VARCHAR', 'constraint' => 150],
            'phone'      => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'password'   => ['type' => 'VARCHAR', 'constraint' => 255],
            'role_id'    => ['type' => 'INT', 'unsigned' => true],
            'status'     => ['type' => 'ENUM', 'constraint' => ['active', 'inactive'], 'default' => 'active'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->createTable('users', true);

        // 06 association
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'            => ['type' => 'VARCHAR', 'constraint' => 200],
            'address'         => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'chairman_phone'  => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'secretary_phone' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'treasurer_phone' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'logo'            => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('association', true);

        // 07 age_groups
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
            'from_age'   => ['type' => 'INT', 'unsigned' => true],
            'to_age'     => ['type' => 'INT', 'unsigned' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('age_groups', true);

        // 08 notification_templates
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 150],
            'content'    => ['type' => 'TEXT'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('notification_templates', true);

        // 09 locations
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 150],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('locations', true);

        // 10 fee
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 150],
            'amount'     => ['type' => 'DECIMAL', 'constraint' => '12,2'],
            'year'       => ['type' => 'YEAR'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('fee', true);

        // 11 payment_modes
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('payment_modes', true);

        // 12 members
        $this->forge->addField([
            'id'                => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'first_name'        => ['type' => 'VARCHAR', 'constraint' => 100],
            'last_name'         => ['type' => 'VARCHAR', 'constraint' => 100],
            'fathers_name'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'mothers_name'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'location_id'       => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'picture'           => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'date_of_birth'     => ['type' => 'DATE', 'null' => true],
            'member_status'     => ['type' => 'ENUM', 'constraint' => ['active', 'inactive'], 'default' => 'active'],
            'marital_status'    => ['type' => 'ENUM', 'constraint' => ['single', 'married', 'divorced', 'widowed'], 'default' => 'single'],
            'phone'             => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'fee_exemption'     => ['type' => 'ENUM', 'constraint' => ['yes', 'no'], 'default' => 'no'],
            'age_group_id'      => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'registration_date' => ['type' => 'DATE', 'null' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('location_id', 'locations', 'id', 'SET NULL', 'RESTRICT');
        $this->forge->addForeignKey('age_group_id', 'age_groups', 'id', 'SET NULL', 'RESTRICT');
        $this->forge->createTable('members', true);

        // 13 fee_payments
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'date'            => ['type' => 'DATE'],
            'payment_mode_id' => ['type' => 'INT', 'unsigned' => true],
            'amount'          => ['type' => 'DECIMAL', 'constraint' => '12,2'],
            'fee_id'          => ['type' => 'INT', 'unsigned' => true],
            'member_id'       => ['type' => 'INT', 'unsigned' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('payment_mode_id', 'payment_modes', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->addForeignKey('fee_id', 'fee', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->addForeignKey('member_id', 'members', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('fee_payments', true);

        // 14 notifications
        $this->forge->addField([
            'id'                       => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'                     => ['type' => 'VARCHAR', 'constraint' => 150],
            'notification_template_id' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'content'                  => ['type' => 'TEXT'],
            'created_at'               => ['type' => 'DATETIME', 'null' => true],
            'updated_at'               => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('notification_template_id', 'notification_templates', 'id', 'SET NULL', 'RESTRICT');
        $this->forge->createTable('notifications', true);

        // 15 notifications_members
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'notification_id' => ['type' => 'INT', 'unsigned' => true],
            'member_id'       => ['type' => 'INT', 'unsigned' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['notification_id', 'member_id']);
        $this->forge->addForeignKey('notification_id', 'notifications', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('member_id', 'members', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('notifications_members', true);

        // 16 logs
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'feature_id' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'user_id'    => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'datetime'   => ['type' => 'DATETIME'],
            'before'     => ['type' => 'TEXT', 'null' => true],
            'after'      => ['type' => 'TEXT', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('feature_id', 'features', 'id', 'SET NULL', 'RESTRICT');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'RESTRICT');
        $this->forge->createTable('logs', true);
    }

    public function down()
    {
        $this->forge->dropTable('logs', true);
        $this->forge->dropTable('notifications_members', true);
        $this->forge->dropTable('notifications', true);
        $this->forge->dropTable('fee_payments', true);
        $this->forge->dropTable('members', true);
        $this->forge->dropTable('payment_modes', true);
        $this->forge->dropTable('fee', true);
        $this->forge->dropTable('locations', true);
        $this->forge->dropTable('notification_templates', true);
        $this->forge->dropTable('age_groups', true);
        $this->forge->dropTable('association', true);
        $this->forge->dropTable('users', true);
        $this->forge->dropTable('roles_features', true);
        $this->forge->dropTable('features', true);
        $this->forge->dropTable('features_group', true);
        $this->forge->dropTable('roles', true);
    }
}
