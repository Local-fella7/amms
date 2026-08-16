<?php

namespace App\Models;

class PaymentModeModel extends BaseModel
{
    protected $table = 'payment_modes';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name'];
}
