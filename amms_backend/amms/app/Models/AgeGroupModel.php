<?php

namespace App\Models;

class AgeGroupModel extends BaseModel
{
    protected $table = 'age_groups';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'from_age', 'to_age'];
}
