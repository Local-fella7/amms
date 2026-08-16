<?php

namespace App\Models;

class FeatureGroupModel extends BaseModel
{
    protected $table = 'features_group';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name'];
}
