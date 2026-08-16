<?php

namespace App\Models;

class MemberModel extends BaseModel
{
    protected $table = 'members';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'first_name', 'last_name', 'gender', 'fathers_name', 'mothers_name',
        'location_id', 'picture', 'date_of_birth', 'member_status',
        'marital_status', 'phone', 'fee_exemption', 'age_group_id', 'registration_date',
    ];
}
