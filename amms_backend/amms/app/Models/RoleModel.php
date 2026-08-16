<?php

namespace App\Models;

class RoleModel extends BaseModel
{
    protected $table = 'roles';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name'];
}
