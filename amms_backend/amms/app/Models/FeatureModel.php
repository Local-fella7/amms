<?php

namespace App\Models;

class FeatureModel extends BaseModel
{
    protected $table = 'features';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'features_group_id'];
}
