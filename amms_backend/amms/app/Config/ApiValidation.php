<?php

namespace Config;

/**
 * Centralized validation rules for API resources (DRY).
 */
class ApiValidation
{
    public static function rules(): array
    {
        return [
            'roles' => [
                'create' => ['name' => 'required|min_length[2]|max_length[100]'],
                'update' => ['name' => 'permit_empty|min_length[2]|max_length[100]'],
            ],
            'features_group' => [
                'create' => ['name' => 'required|min_length[2]|max_length[100]'],
                'update' => ['name' => 'permit_empty|min_length[2]|max_length[100]'],
            ],
            'features' => [
                'create' => [
                    'name'              => 'required|min_length[2]|max_length[150]',
                    'features_group_id' => 'required|integer|is_not_unique[features_group.id]',
                ],
                'update' => [
                    'name'              => 'permit_empty|min_length[2]|max_length[150]',
                    'features_group_id' => 'permit_empty|integer|is_not_unique[features_group.id]',
                ],
            ],
            'roles_features' => [
                'create' => [
                    'role_id'    => 'required|integer|is_not_unique[roles.id]',
                    'feature_id' => 'required|integer|is_not_unique[features.id]',
                ],
                'update' => [
                    'role_id'    => 'permit_empty|integer|is_not_unique[roles.id]',
                    'feature_id' => 'permit_empty|integer|is_not_unique[features.id]',
                ],
            ],
            'users' => [
                'create' => [
                    'first_name' => 'required|min_length[2]|max_length[100]',
                    'last_name'  => 'required|min_length[2]|max_length[100]',
                    'email'      => 'required|valid_email|is_unique[users.email]',
                    'phone'      => 'permit_empty|max_length[20]',
                    'password'   => 'permit_empty|min_length[6]',
                    'role_id'    => 'required|integer|is_not_unique[roles.id]',
                    'status'     => 'permit_empty|in_list[active,inactive]',
                ],
                'update' => [
                    'first_name' => 'permit_empty|min_length[2]|max_length[100]',
                    'last_name'  => 'permit_empty|min_length[2]|max_length[100]',
                    'email'      => 'permit_empty|valid_email',
                    'phone'      => 'permit_empty|max_length[20]',
                    'password'   => 'permit_empty|min_length[6]',
                    'role_id'    => 'permit_empty|integer|is_not_unique[roles.id]',
                    'status'     => 'permit_empty|in_list[active,inactive]',
                ],
            ],
            'association' => [
                'create' => [
                    'name'            => 'required|min_length[2]|max_length[200]',
                    'address'         => 'permit_empty|max_length[255]',
                    'chairman_phone'  => 'permit_empty|max_length[20]',
                    'secretary_phone' => 'permit_empty|max_length[20]',
                    'treasurer_phone' => 'permit_empty|max_length[20]',
                    'logo'            => 'permit_empty|max_length[255]',
                ],
                'update' => [
                    'name'            => 'permit_empty|min_length[2]|max_length[200]',
                    'address'         => 'permit_empty|max_length[255]',
                    'chairman_phone'  => 'permit_empty|max_length[20]',
                    'secretary_phone' => 'permit_empty|max_length[20]',
                    'treasurer_phone' => 'permit_empty|max_length[20]',
                    'logo'            => 'permit_empty|max_length[255]',
                ],
            ],
            'age_groups' => [
                'create' => [
                    'name'     => 'required|min_length[2]|max_length[100]',
                    'from_age' => 'required|integer|greater_than_equal_to[0]',
                    'to_age'   => 'required|integer|greater_than_equal_to[{from_age}]',
                ],
                'update' => [
                    'name'     => 'permit_empty|min_length[2]|max_length[100]',
                    'from_age' => 'permit_empty|integer|greater_than_equal_to[0]',
                    'to_age'   => 'permit_empty|integer',
                ],
            ],
            'notification_templates' => [
                'create' => [
                    'name'    => 'required|min_length[2]|max_length[150]',
                    'content' => 'required',
                ],
                'update' => [
                    'name'    => 'permit_empty|min_length[2]|max_length[150]',
                    'content' => 'permit_empty',
                ],
            ],
            'locations' => [
                'create' => ['name' => 'required|min_length[2]|max_length[150]'],
                'update' => ['name' => 'permit_empty|min_length[2]|max_length[150]'],
            ],
            'fee' => [
                'create' => [
                    'name'   => 'required|min_length[2]|max_length[150]',
                    'amount' => 'required|decimal|greater_than[0]',
                    'year'   => 'required|integer|greater_than[1900]',
                ],
                'update' => [
                    'name'   => 'permit_empty|min_length[2]|max_length[150]',
                    'amount' => 'permit_empty|decimal|greater_than[0]',
                    'year'   => 'permit_empty|integer|greater_than[1900]',
                ],
            ],
            'payment_modes' => [
                'create' => ['name' => 'required|min_length[2]|max_length[100]'],
                'update' => ['name' => 'permit_empty|min_length[2]|max_length[100]'],
            ],
            'members' => [
                'create' => [
                    'first_name'        => 'required|min_length[2]|max_length[100]',
                    'last_name'         => 'required|min_length[2]|max_length[100]',
                    'gender'            => 'required|in_list[male,female]',
                    'fathers_name'      => 'permit_empty|max_length[100]',
                    'mothers_name'      => 'permit_empty|max_length[100]',
                    'location_id'       => 'permit_empty|integer|is_not_unique[locations.id]',
                    'picture'           => 'permit_empty|max_length[255]',
                    'date_of_birth'     => 'permit_empty|valid_date[Y-m-d]',
                    'member_status'     => 'permit_empty|in_list[active,inactive,deceased]',
                    'marital_status'    => 'permit_empty|in_list[single,married,divorced,widowed]',
                    'phone'             => 'permit_empty|max_length[20]',
                    'fee_exemption'     => 'permit_empty|in_list[yes,no]',
                    'age_group_id'      => 'permit_empty|integer|is_not_unique[age_groups.id]',
                    'registration_date' => 'permit_empty|valid_date[Y-m-d]',
                ],
                'update' => [
                    'first_name'        => 'permit_empty|min_length[2]|max_length[100]',
                    'last_name'         => 'permit_empty|min_length[2]|max_length[100]',
                    'gender'            => 'permit_empty|in_list[male,female]',
                    'fathers_name'      => 'permit_empty|max_length[100]',
                    'mothers_name'      => 'permit_empty|max_length[100]',
                    'location_id'       => 'permit_empty|integer|is_not_unique[locations.id]',
                    'picture'           => 'permit_empty|max_length[255]',
                    'date_of_birth'     => 'permit_empty|valid_date[Y-m-d]',
                    'member_status'     => 'permit_empty|in_list[active,inactive,deceased]',
                    'marital_status'    => 'permit_empty|in_list[single,married,divorced,widowed]',
                    'phone'             => 'permit_empty|max_length[20]',
                    'fee_exemption'     => 'permit_empty|in_list[yes,no]',
                    'age_group_id'      => 'permit_empty|integer|is_not_unique[age_groups.id]',
                    'registration_date' => 'permit_empty|valid_date[Y-m-d]',
                ],
                'photo' => [
                    'photo'      => 'permit_empty|uploaded[photo]|max_size[photo,5120]|is_image[photo]|mime_in[photo,image/jpg,image/jpeg,image/png,image/gif,image/webp]',
                    'crop_x'     => 'permit_empty|integer',
                    'crop_y'     => 'permit_empty|integer',
                    'crop_width' => 'permit_empty|integer|greater_than[0]',
                    'crop_height'=> 'permit_empty|integer|greater_than[0]',
                ],
            ],
            'fee_payments' => [
                'create' => [
                    'date'            => 'required|valid_date[Y-m-d]',
                    'payment_mode_id' => 'required|integer|is_not_unique[payment_modes.id]',
                    'amount'          => 'required|decimal|greater_than[0]',
                    'fee_id'          => 'required|integer|is_not_unique[fee.id]',
                    'member_id'       => 'required|integer|is_not_unique[members.id]',
                ],
            ],
            'notifications' => [
                'create' => [
                    'name'                     => 'required|min_length[2]|max_length[150]',
                    'notification_template_id' => 'permit_empty|integer|is_not_unique[notification_templates.id]',
                    'content'                  => 'required',
                ],
                'update' => [
                    'name'                     => 'permit_empty|min_length[2]|max_length[150]',
                    'notification_template_id' => 'permit_empty|integer|is_not_unique[notification_templates.id]',
                    'content'                  => 'permit_empty',
                ],
            ],
            'notifications_members' => [
                'create' => [
                    'notification_id' => 'required|integer|is_not_unique[notifications.id]',
                    'member_id'       => 'required|integer|is_not_unique[members.id]',
                ],
                'update' => [
                    'notification_id' => 'permit_empty|integer|is_not_unique[notifications.id]',
                    'member_id'       => 'permit_empty|integer|is_not_unique[members.id]',
                ],
            ],
            'logs' => [
                'create' => [
                    'feature_id' => 'permit_empty|integer|is_not_unique[features.id]',
                    'user_id'    => 'permit_empty|integer|is_not_unique[users.id]',
                    'datetime'   => 'required|valid_date[Y-m-d H:i:s]',
                    'before'     => 'permit_empty',
                    'after'      => 'permit_empty',
                ],
                'update' => [
                    'feature_id' => 'permit_empty|integer|is_not_unique[features.id]',
                    'user_id'    => 'permit_empty|integer|is_not_unique[users.id]',
                    'datetime'   => 'permit_empty|valid_date[Y-m-d H:i:s]',
                    'before'     => 'permit_empty',
                    'after'      => 'permit_empty',
                ],
            ],
            'auth' => [
                'login' => [
                    'email'    => 'required|valid_email',
                    'password' => 'required',
                ],
                'change_password' => [
                    'current_password' => 'required',
                    'new_password'     => 'required|min_length[6]',
                ],
            ],
        ];
    }

    public static function for(string $resource, string $action): array
    {
        $rules = self::rules();

        return $rules[$resource][$action] ?? [];
    }
}
