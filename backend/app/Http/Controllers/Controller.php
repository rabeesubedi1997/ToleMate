<?php

namespace App\Http\Controllers;

use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    /**
     * Verify a captcha token from a public web form.
     * Mobile app requests (X-Platform: mobile) are exempt since the
     * native app has no way to render the reCAPTCHA widget.
     * Returns a 422 JsonResponse to abort with, or null when it's fine to proceed.
     */
    protected function rejectIfCaptchaInvalid(Request $request): ?JsonResponse
    {
        if ($request->header('X-Platform') === 'mobile') {
            return null;
        }

        if (!CaptchaService::isEnabled()) {
            return null;
        }

        $valid = CaptchaService::verify($request->input('captcha_token'), $request->ip());

        if (!$valid) {
            return response()->json(['message' => 'Captcha verification failed. Please try again.'], 422);
        }

        return null;
    }
}
