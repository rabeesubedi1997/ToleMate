<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;

class CaptchaService
{
    /**
     * Whether captcha protection is currently turned on by the super admin.
     */
    public static function isEnabled(): bool
    {
        $value = Setting::where('key', 'captcha_enabled')->value('value');

        return in_array($value, ['1', 1, true, 'true'], true);
    }

    /**
     * Verify a captcha token against Google's siteverify endpoint.
     * Returns true when captcha is disabled (nothing to verify).
     */
    public static function verify(?string $token, ?string $ip = null): bool
    {
        if (!self::isEnabled()) {
            return true;
        }

        $secret = Setting::where('key', 'recaptcha_secret_key')->value('value');

        if (!$secret) {
            // Misconfigured: fail open rather than locking every form.
            return true;
        }

        if (!$token) {
            return false;
        }

        try {
            $response = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $ip,
            ]);

            return (bool) ($response->json('success') ?? false);
        } catch (\Throwable $e) {
            // Network failure talking to Google: don't lock users out entirely.
            return true;
        }
    }
}
