<?php

namespace App\Models;

class AssociationModel extends BaseModel
{
    protected $table = 'association';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'address', 'chairman_phone', 'secretary_phone', 'treasurer_phone', 'logo'];
}
