<?php

/**
 * @var \CodeIgniter\Router\RouteCollection $routes
 */
$routes->group('api', static function ($routes) {
    $routes->post('auth/login', '\App\Controllers\Api\AuthController::login');

    $resources = [
        'roles'                   => '\App\Controllers\Api\RolesController',
        'feature-groups'          => '\App\Controllers\Api\FeatureGroupsController',
        'features'                => '\App\Controllers\Api\FeaturesController',
        'role-features'           => '\App\Controllers\Api\RoleFeaturesController',
        'users'                   => '\App\Controllers\Api\UsersController',
        'association'             => '\App\Controllers\Api\AssociationController',
        'age-groups'              => '\App\Controllers\Api\AgeGroupsController',
        'notification-templates'  => '\App\Controllers\Api\NotificationTemplatesController',
        'locations'               => '\App\Controllers\Api\LocationsController',
        'fees'                    => '\App\Controllers\Api\FeesController',
        'payment-modes'           => '\App\Controllers\Api\PaymentModesController',
        'members'                 => '\App\Controllers\Api\MembersController',
        'fee-payments'            => '\App\Controllers\Api\FeePaymentsController',
        'notifications'           => '\App\Controllers\Api\NotificationsController',
        'notification-members'    => '\App\Controllers\Api\NotificationMembersController',
        'logs'                    => '\App\Controllers\Api\LogsController',
    ];

    $readOnlyResources = ['fee-payments'];

    $routes->group('', ['filter' => 'jwtauth'], static function ($routes) use ($resources, $readOnlyResources) {
        $routes->get('auth/me', '\App\Controllers\Api\AuthController::me');
        $routes->post('auth/change-password', '\App\Controllers\Api\AuthController::changePassword');
        $routes->get('fee-payments/outstanding', '\App\Controllers\Api\FeePaymentsController::outstanding');
        $routes->get('fee-payments/outstanding/(:num)', '\App\Controllers\Api\FeePaymentsController::outstanding/$1');

        $routes->get('reports/outstanding', '\App\Controllers\Api\ReportsController::outstanding');
        $routes->get('reports/members', '\App\Controllers\Api\ReportsController::members');
        $routes->get('reports/age-groups', '\App\Controllers\Api\ReportsController::ageGroups');
        $routes->get('reports/locations', '\App\Controllers\Api\ReportsController::locations');
        $routes->get('reports/gender', '\App\Controllers\Api\ReportsController::gender');
        $routes->get('reports/deceased', '\App\Controllers\Api\ReportsController::deceased');
        $routes->get('reports/profile/(:num)', '\App\Controllers\Api\ReportsController::profile/$1');
        $routes->get('reports/fee-payments', '\App\Controllers\Api\ReportsController::feePayments');
        $routes->get('reports/member-history', '\App\Controllers\Api\ReportsController::memberHistory');
        $routes->get('reports/member-history/(:num)', '\App\Controllers\Api\ReportsController::memberHistory/$1');

        foreach ($resources as $uri => $controller) {
            $routes->get($uri, "{$controller}::index");
            $routes->get($uri . '/(:num)', "{$controller}::show/$1");
            $routes->post($uri, "{$controller}::create");

            if (! in_array($uri, $readOnlyResources, true)) {
                $routes->put($uri . '/(:num)', "{$controller}::update/$1");
            }

            $routes->delete($uri . '/(:num)', "{$controller}::delete/$1");
        }
    });
});
