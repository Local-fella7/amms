<?php

namespace App\Models;

class FeePaymentModel extends BaseModel
{
    protected $table = 'fee_payments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['date', 'payment_mode_id', 'amount', 'fee_id', 'member_id'];
}
