<?php

namespace App\Models;

class RoleFeatureModel extends BaseModel
{
    protected $table = 'roles_features';
    protected $primaryKey = 'id';
    protected $allowedFields = ['role_id', 'feature_id'];
}
