<?php

namespace App\Models;

class LocationModel extends BaseModel
{
    protected $table = 'locations';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name'];
}
