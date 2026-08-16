<?php

namespace App\Models;

class FeeModel extends BaseModel
{
    protected $table = 'fee';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'amount', 'year'];
}
