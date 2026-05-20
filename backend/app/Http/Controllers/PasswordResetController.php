<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class PasswordResetController extends Controller
{
    /**
     * Send a password reset link to the given email (public).
     */
    public function sendResetLink(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $status = Password::sendResetLink($request->only('email'));

        // Always return success-looking message to avoid user enumeration
        return response()->json([
            'message' => 'If this email is registered, a password reset link has been sent.',
        ]);
    }

    /**
     * Reset password using the token received via email (public).
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                // Revoke all existing Sanctum tokens so old sessions are invalidated
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully. You can now log in.']);
        }

        return response()->json(['message' => 'This reset link is invalid or has expired.'], 422);
    }

    /**
     * Admin-only: force reset a user's password.
     * action=generate  → create a random password and return it
     * action=email     → send a standard password reset email to the user
     */
    public function adminResetPassword(Request $request, $id)
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:generate,email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->action === 'generate') {
            $newPassword = Str::random(12);
            $user->forceFill(['password' => Hash::make($newPassword)])->save();
            // Revoke all existing sessions for this user
            $user->tokens()->delete();

            return response()->json([
                'message'      => "Password generated and applied for {$user->name}.",
                'new_password' => $newPassword,
                'user'         => ['name' => $user->name, 'email' => $user->email],
            ]);
        }

        // action === 'email': send standard reset link
        Password::sendResetLink(['email' => $user->email]);

        return response()->json([
            'message' => "Password reset email sent to {$user->email}.",
        ]);
    }
}
