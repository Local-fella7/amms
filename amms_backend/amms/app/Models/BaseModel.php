<?php

namespace App\Models;

use CodeIgniter\Model;

abstract class BaseModel extends Model
{
    protected $useTimestamps = true;

    protected $createdField = 'created_at';

    protected $updatedField = 'updated_at';

    protected $returnType = 'array';

    protected $useSoftDeletes = false;
}
