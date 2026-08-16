<?php

namespace App\Models;

class LogModel extends BaseModel
{
    protected $table = 'logs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['feature_id', 'user_id', 'datetime', 'before', 'after'];
}
