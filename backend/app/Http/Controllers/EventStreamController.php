<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\Booking;
use App\Models\Vendor;

class EventStreamController extends Controller
{
    /**
     * Global server-sent event stream for one authenticated user.
     *
     * Architecture:
     *   1. Client opens GET /api/events?lastEventId=N (or browser sends Last-Event-ID header).
     *   2. Server polls the DB every 500ms for new messages addressed to this user.
     *   3. When found, streams them as SSE `message` events with numeric `id:`.
     *   4. After 55s the connection closes naturally — the browser auto-reconnects
     *      sending the Last-Event-ID header, so no messages are missed.
     *
     * Requires a multi-worker server (Laragon Apache + mod_fcgid) for concurrent connections.
     */
    public function stream(Request $request)
    {
        $user = $request->user();

        // Prefer Last-Event-ID header (sent automatically by the browser on reconnect)
        // over the explicit query-param used on the first connection.
        $lastEventId = 0;
        if (!empty($_SERVER['HTTP_LAST_EVENT_ID'])) {
            $lastEventId = (int) $_SERVER['HTTP_LAST_EVENT_ID'];
        } elseif ($request->has('lastEventId')) {
            $lastEventId = (int) $request->input('lastEventId');
        }

        // Pre-compute the booking IDs this user participates in (avoid re-querying in loop)
        $bookingIds = Booking::where('customer_id', $user->id)
            ->orWhere('vendor_id', $user->id)
            ->pluck('id')
            ->toArray();

        return response()->stream(
            function () use ($user, $lastEventId, $bookingIds) {
                // Release session lock so other requests from the same user aren't blocked
                if (session_status() === PHP_SESSION_ACTIVE) {
                    session_write_close();
                }

                // Clear any existing output buffer and enable implicit flushing
                // so every echo reaches the client immediately without manual flush() calls.
                if (ob_get_level()) ob_end_clean();
                ob_implicit_flush(true);

                // Extend PHP execution limit beyond the stream duration
                set_time_limit(120);

                $current  = $lastEventId;
                $deadline = time() + 55; // server closes after 55s; browser auto-reconnects

                while (time() < $deadline && !connection_aborted()) {
                    // ── Find new messages for this user since last seen ──────────────
                    $newMessages = Message::where('id', '>', $current)
                        ->where(function ($q) use ($user, $bookingIds) {
                            // Direct messages to/from this user
                            $q->where(function ($d) use ($user) {
                                $d->whereNull('booking_id')
                                    ->where(function ($inner) use ($user) {
                                        $inner->where('sender_id', $user->id)
                                            ->orWhere('receiver_id', $user->id);
                                    });
                            });
                            // Booking messages in any booking this user participates in
                            if (!empty($bookingIds)) {
                                $q->orWhere(function ($b) use ($bookingIds) {
                                    $b->whereIn('booking_id', $bookingIds);
                                });
                            }
                            // Admin sees all messages
                            if ($user->role === 'admin') {
                                $q->orWhereNotNull('id');
                            }
                        })
                        ->with(['sender', 'receiver'])
                        ->orderBy('id', 'asc')
                        ->limit(20)
                        ->get();

                    if ($newMessages->isNotEmpty()) {
                        foreach ($newMessages as $msg) {
                            $sender   = $msg->sender;
                            $receiver = $msg->receiver;

                            // Build display label: vendor → business name, others → real name
                            $label = $sender?->name ?? 'Unknown';
                            if ($sender?->role === 'vendor') {
                                $biz = Vendor::where('user_id', $sender->id)->value('business_name');
                                if ($biz) $label = $biz;
                            }

                            $payload = [
                                'id'           => $msg->id,
                                'booking_id'   => $msg->booking_id,
                                'sender_id'    => $msg->sender_id,
                                'receiver_id'  => $msg->receiver_id,
                                'message'      => $msg->message,
                                'is_read'      => (bool) $msg->is_read,
                                'created_at'   => $msg->created_at,
                                'sender_label' => $label,
                                'sender_role'  => $sender?->role ?? 'customer',
                                'sender'       => $sender   ? ['id' => $sender->id,   'name' => $sender->name,   'role' => $sender->role] : null,
                                'receiver'     => $receiver ? ['id' => $receiver->id, 'name' => $receiver->name] : null,
                            ];

                            echo "id: {$msg->id}\n";
                            echo "event: message\n";
                            echo "data: " . json_encode($payload) . "\n\n";
                        }

                        $current = $newMessages->last()->id;
                    } else {
                        // SSE comment — keeps connection alive, ignored by browser
                        echo ": heartbeat\n\n";
                    }

                    usleep(500000); // Poll every 500ms
                }
                // Connection ends naturally — browser reconnects with Last-Event-ID header
            },
            200,
            [
                'Content-Type'      => 'text/event-stream',
                'Cache-Control'     => 'no-cache, no-store',
                'X-Accel-Buffering' => 'no',
                'Connection'        => 'keep-alive',
            ]
        );
    }
}
