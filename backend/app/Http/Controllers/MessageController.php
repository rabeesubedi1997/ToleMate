<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Message;
use App\Models\Booking;
use App\Models\User;

class MessageController extends Controller
{
    /**
     * Get messages.
     * - ?booking_id=X  → booking messages (customer + vendor + admin)
     * - ?with=USER_ID  → direct messages between current user and that user
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($request->has('booking_id')) {
            $bookingId = $request->booking_id;

            $booking = Booking::where('id', $bookingId)
                ->where(function ($q) use ($user) {
                    $q->where('customer_id', $user->id)
                        ->orWhere('vendor_id', $user->id);
                })
                ->first();

            if (!$booking && $user->role !== 'admin') {
                return response()->json(['message' => 'Booking not found or unauthorized'], 404);
            }

            // Allow admin to load any booking
            if (!$booking) {
                $booking = Booking::find($bookingId);
                if (!$booking) {
                    return response()->json(['message' => 'Booking not found'], 404);
                }
            }

            $lastId = (int) $request->input('lastId', 0);

            $query = Message::where('booking_id', $bookingId)
                ->with(['sender', 'receiver'])
                ->orderBy('created_at', 'asc');

            if ($lastId > 0) {
                $query->where('id', '>', $lastId);
            }

            $messages = $query->get()
                ->map(function ($msg) {
                    $sender = $msg->sender;
                    // Build a display label: vendor → business name, customer/admin → name
                    $label = $sender?->name ?? 'Unknown';
                    if ($sender?->role === 'vendor') {
                        $vp = \App\Models\Vendor::where('user_id', $sender->id)->value('business_name');
                        if ($vp) $label = $vp;
                    }
                    return array_merge($msg->toArray(), [
                        'sender_label' => $label,
                        'sender_role'  => $sender?->role ?? 'customer',
                    ]);
                });

            Message::where('booking_id', $bookingId)
                ->where('receiver_id', $user->id)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            return response()->json($messages);
        }

        if ($request->has('with')) {
            $withId = (int) $request->with;

            $lastId = (int) $request->input('lastId', 0);

            $query = Message::whereNull('booking_id')
                ->where(function ($q) use ($user, $withId) {
                    $q->where(function ($inner) use ($user, $withId) {
                        $inner->where('sender_id', $user->id)
                            ->where('receiver_id', $withId);
                    })->orWhere(function ($inner) use ($user, $withId) {
                        $inner->where('sender_id', $withId)
                            ->where('receiver_id', $user->id);
                    });
                })
                ->with(['sender', 'receiver'])
                ->orderBy('created_at', 'asc');

            if ($lastId > 0) {
                $query->where('id', '>', $lastId);
            }

            $messages = $query->get()
                ->map(function ($msg) {
                    $sender = $msg->sender;
                    $label = $sender?->name ?? 'Unknown';
                    if ($sender?->role === 'vendor') {
                        $vp = \App\Models\Vendor::where('user_id', $sender->id)->value('business_name');
                        if ($vp) $label = $vp;
                    }
                    return array_merge($msg->toArray(), [
                        'sender_label' => $label,
                        'sender_role'  => $sender?->role ?? 'customer',
                    ]);
                });

            Message::whereNull('booking_id')
                ->where('sender_id', $withId)
                ->where('receiver_id', $user->id)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            return response()->json($messages);
        }

        return response()->json(['message' => 'booking_id or with parameter is required'], 400);
    }

    /**
     * Send a message.
     * Booking chat:  provide booking_id (receiver auto-determined).
     * Direct chat:   provide receiver_id only (booking_id omitted).
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'booking_id'  => 'nullable|exists:bookings,id',
            'receiver_id' => 'nullable|exists:users,id',
            'message'     => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $receiverId = null;

        if ($request->booking_id) {
            $booking = Booking::where('id', $request->booking_id)
                ->where(function ($q) use ($user) {
                    $q->where('customer_id', $user->id)
                        ->orWhere('vendor_id', $user->id);
                })
                ->first();

            if (!$booking && $user->role === 'admin') {
                $booking = Booking::find($request->booking_id);
            }

            if (!$booking) {
                return response()->json(['message' => 'Booking not found or unauthorized'], 404);
            }

            $receiverId = ($booking->customer_id === $user->id)
                ? $booking->vendor_id
                : $booking->customer_id;
        } elseif ($request->receiver_id) {
            $receiverId = $request->receiver_id;
        } else {
            return response()->json(['message' => 'booking_id or receiver_id is required'], 422);
        }

        $message = Message::create([
            'booking_id'  => $request->booking_id ?? null,
            'sender_id'   => $user->id,
            'receiver_id' => $receiverId,
            'message'     => $request->message,
            'is_read'     => false,
        ]);

        $message->load(['sender', 'receiver']);
        $sender = $message->sender;
        $label  = $sender?->name ?? 'Unknown';
        if ($sender?->role === 'vendor') {
            $vp = \App\Models\Vendor::where('user_id', $sender->id)->value('business_name');
            if ($vp) $label = $vp;
        }
        $msgArray = array_merge($message->toArray(), [
            'sender_label' => $label,
            'sender_role'  => $sender?->role ?? 'customer',
        ]);

        return response()->json([
            'message' => $msgArray,
            'success' => true,
        ], 201);
    }

    /**
     * Booking-based conversations for the current user.
     * Admin gets ALL bookings that have at least one message.
     */
    public function conversations(Request $request)
    {
        $user = $request->user();

        $query = Booking::with([
            'service',
            'customer',
            'vendor.user',
            'messages' => function ($q) {
                $q->latest()->limit(1);
            },
        ])->orderBy('updated_at', 'desc');

        if ($user->role === 'admin') {
            // Admin sees all bookings that have at least one message
            $query->whereHas('messages');
        } else {
            $query->where(function ($q) use ($user) {
                $q->where('customer_id', $user->id)
                    ->orWhere('vendor_id', $user->id);
            });
        }

        return response()->json($query->get());
    }

    /**
     * Direct (non-booking) conversations for the current user.
     * Returns [{other_user, last_message, last_at, unread_count}].
     */
    public function directConversations(Request $request)
    {
        $user = $request->user();

        $messages = Message::whereNull('booking_id')
            ->where(function ($q) use ($user) {
                $q->where('sender_id', $user->id)
                    ->orWhere('receiver_id', $user->id);
            })
            ->with(['sender', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->get();

        $grouped = [];
        foreach ($messages as $msg) {
            $otherId = ($msg->sender_id === $user->id) ? $msg->receiver_id : $msg->sender_id;
            $other   = ($msg->sender_id === $user->id) ? $msg->receiver : $msg->sender;

            if (!isset($grouped[$otherId])) {
                $grouped[$otherId] = [
                    'other_user'   => [
                        'id'   => $other?->id,
                        'name' => $other?->name ?? 'Unknown',
                        'role' => $other?->role ?? 'user',
                    ],
                    'last_message' => $msg->message,
                    'last_at'      => $msg->created_at,
                    'unread_count' => 0,
                ];
            }

            if ($msg->receiver_id === $user->id && !$msg->is_read) {
                $grouped[$otherId]['unread_count']++;
            }
        }

        return response()->json(array_values($grouped));
    }

    /**
     * Mark messages as read.
     * PUT /api/messages/{id}/read          → mark single message
     * PUT /api/messages/read?booking_id=X  → mark all in booking
     * PUT /api/messages/read?sender_id=X   → mark all direct from sender
     */
    public function markAsRead(Request $request, $id = null)
    {
        $user = $request->user();

        if ($id && is_numeric($id)) {
            Message::where('id', $id)
                ->where('receiver_id', $user->id)
                ->update(['is_read' => true]);
        }

        if ($request->booking_id) {
            Message::where('booking_id', $request->booking_id)
                ->where('receiver_id', $user->id)
                ->update(['is_read' => true]);
        }

        if ($request->sender_id) {
            Message::whereNull('booking_id')
                ->where('sender_id', $request->sender_id)
                ->where('receiver_id', $user->id)
                ->update(['is_read' => true]);
        }

        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * Unread message count for the current user.
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();

        $count = Message::where('receiver_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * SSE stream for real-time messages.
     * EventSource cannot send custom headers, so the token is passed via ?token=
     * Route is outside auth:sanctum — auth is handled manually here.
     *
     * GET /api/messages/stream?token=X&booking_id=Y   (booking chat)
     * GET /api/messages/stream?token=X&with=USER_ID   (direct chat)
     * GET /api/messages/stream?token=X&booking_id=Y&lastId=Z  (resume)
     */
    public function streamMessages(Request $request)
    {
        // --- Manual token auth (EventSource can't send Authorization header) ---
        $rawToken = $request->query('token');
        $user     = null;
        if ($rawToken) {
            $pat = \Laravel\Sanctum\PersonalAccessToken::findToken($rawToken);
            if ($pat && $pat->tokenable) {
                $user = $pat->tokenable;
            }
        }
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $bookingId = $request->query('booking_id');
        $withId    = $request->query('with');
        $lastId    = (int) $request->query('lastId', 0);

        // Authorise access to this conversation
        if ($bookingId) {
            $booking = Booking::where('id', $bookingId)
                ->where(function ($q) use ($user) {
                    $q->where('customer_id', $user->id)
                        ->orWhere('vendor_id', $user->id);
                })->first();
            if (!$booking && $user->role !== 'admin') {
                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

        return response()->stream(function () use ($bookingId, $withId, $user, $lastId) {
            // Remove PHP execution time limit for long-lived connections
            set_time_limit(0);

            // Max 55 seconds per connection — client must reconnect after this
            // This frees PHP-FPM workers regularly and prevents resource starvation
            $connectionStart = time();
            $maxDuration = 55;

            // Initial heartbeat so the browser knows the connection is open
            echo ": connected\n\n";
            ob_flush();
            flush();

            while (true) {
                // Close connection after max duration — client will reconnect automatically
                if (connection_aborted() || (time() - $connectionStart) >= $maxDuration) {
                    // Send a reconnect event so the client knows to reconnect from lastId
                    echo "event: reconnect\n";
                    echo "data: {\"lastId\":{$lastId}}\n\n";
                    ob_flush();
                    flush();
                    break;
                }

                // Build query for messages newer than last seen
                $query = Message::where('id', '>', $lastId)
                    ->with(['sender', 'receiver'])
                    ->orderBy('id', 'asc');

                if ($bookingId) {
                    $query->where('booking_id', $bookingId);
                } elseif ($withId) {
                    $query->whereNull('booking_id')
                        ->where(function ($q) use ($user, $withId) {
                            $q->where(function ($i) use ($user, $withId) {
                                $i->where('sender_id', $user->id)
                                    ->where('receiver_id', $withId);
                            })->orWhere(function ($i) use ($user, $withId) {
                                $i->where('sender_id', $withId)
                                    ->where('receiver_id', $user->id);
                            });
                        });
                }

                $messages = $query->get()->map(function ($msg) {
                    $sender = $msg->sender;
                    $label  = $sender?->name ?? 'Unknown';
                    if ($sender?->role === 'vendor') {
                        // Load vendor profile separately to avoid eager-load errors
                        $vendorProfile = \App\Models\Vendor::where('user_id', $sender->id)->first();
                        if ($vendorProfile?->business_name) {
                            $label = $vendorProfile->business_name;
                        }
                    }
                    return array_merge($msg->toArray(), [
                        'sender_label' => $label,
                        'sender_role'  => $sender?->role ?? 'customer',
                    ]);
                });

                if ($messages->isNotEmpty()) {
                    $lastId = $messages->last()['id'];
                    echo "id: {$lastId}\n";
                    echo "data: " . json_encode($messages) . "\n\n";
                    ob_flush();
                    flush();
                } else {
                    // Keepalive comment (not dispatched as a message event)
                    echo ": ping\n\n";
                    ob_flush();
                    flush();
                }

                sleep(2);
            }
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }
}
