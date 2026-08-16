<?php

namespace App\Libraries;

use Config\Jwt as JwtConfig;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    protected JwtConfig $config;

    public function __construct(?JwtConfig $config = null)
    {
        $this->config = $config ?? config('Jwt');
    }

    public function encode(array $payload): string
    {
        $now = time();
        $tokenPayload = array_merge($payload, [
            'iss' => $this->config->issuer,
            'iat' => $now,
            'exp' => $now + $this->config->expiration,
        ]);

        return JWT::encode($tokenPayload, $this->getSecret(), $this->config->algorithm);
    }

    public function decode(string $token): object
    {
        return JWT::decode($token, new Key($this->getSecret(), $this->config->algorithm));
    }

    protected function getSecret(): string
    {
        $secret = $this->config->secretKey;

        if ($secret === '') {
            throw new \RuntimeException('JWT secret key is not configured.');
        }

        return $secret;
    }
}
