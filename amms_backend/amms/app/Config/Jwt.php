<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Jwt extends BaseConfig
{
    public string $secretKey = '';

    public int $expiration = 3600;

    public string $algorithm = 'HS256';

    public string $issuer = 'amms-api';

    public function __construct()
    {
        parent::__construct();

        $this->secretKey = env('jwt.secretKey', $this->secretKey);
        $this->expiration = (int) env('jwt.expiration', $this->expiration);
    }
}
