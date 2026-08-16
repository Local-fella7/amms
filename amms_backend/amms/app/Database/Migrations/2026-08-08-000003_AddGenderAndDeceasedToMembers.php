<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddGenderAndDeceasedToMembers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('members', [
            'gender' => [
                'type'       => 'ENUM',
                'constraint' => ['male', 'female'],
                'null'       => true,
                'after'      => 'last_name',
            ],
        ]);

        $this->forge->modifyColumn('members', [
            'member_status' => [
                'type'       => 'ENUM',
                'constraint' => ['active', 'inactive', 'deceased'],
                'default'    => 'active',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('members', 'gender');

        $this->forge->modifyColumn('members', [
            'member_status' => [
                'type'       => 'ENUM',
                'constraint' => ['active', 'inactive'],
                'default'    => 'active',
            ],
        ]);
    }
}
