<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * Submit a contact form message (public).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($captchaError = $this->rejectIfCaptchaInvalid($request)) {
            return $captchaError;
        }

        ContactMessage::create($request->only('name', 'email', 'subject', 'message'));

        return response()->json(['message' => 'Thanks for reaching out! We will get back to you soon.'], 201);
    }

    /**
     * List contact messages (admin only).
     */
    public function index(Request $request)
    {
        return response()->json(
            ContactMessage::orderByDesc('created_at')->paginate(20)
        );
    }

    /**
     * Mark a message as read (admin only).
     */
    public function markRead(Request $request, $id)
    {
        $message = ContactMessage::findOrFail($id);
        $message->update(['is_read' => true]);
        return response()->json($message);
    }

    /**
     * Delete a message (admin only).
     */
    public function destroy($id)
    {
        ContactMessage::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }
}
