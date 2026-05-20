<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Speed up direct-conversation queries (whereNull booking_id + sender/receiver)
            if (!Schema::hasIndex('messages', 'messages_booking_id_sender_id_index')) {
                $table->index(['booking_id', 'sender_id'], 'messages_booking_id_sender_id_index');
            }
            if (!Schema::hasIndex('messages', 'messages_booking_id_receiver_id_index')) {
                $table->index(['booking_id', 'receiver_id'], 'messages_booking_id_receiver_id_index');
            }
            // Speed up SSE stream queries (where booking_id/with AND id > lastId)
            if (!Schema::hasIndex('messages', 'messages_booking_id_id_index')) {
                $table->index(['booking_id', 'id'], 'messages_booking_id_id_index');
            }
            // Speed up unread count / is_read updates
            if (!Schema::hasIndex('messages', 'messages_receiver_id_is_read_index')) {
                $table->index(['receiver_id', 'is_read'], 'messages_receiver_id_is_read_index');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            // Speed up conversations query: order by updated_at
            if (!Schema::hasIndex('bookings', 'bookings_updated_at_index')) {
                $table->index('updated_at', 'bookings_updated_at_index');
            }
            // Speed up customer/vendor booking lookups
            if (!Schema::hasIndex('bookings', 'bookings_customer_id_index')) {
                $table->index('customer_id', 'bookings_customer_id_index');
            }
            if (!Schema::hasIndex('bookings', 'bookings_vendor_id_index')) {
                $table->index('vendor_id', 'bookings_vendor_id_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_booking_id_sender_id_index');
            $table->dropIndex('messages_booking_id_receiver_id_index');
            $table->dropIndex('messages_booking_id_id_index');
            $table->dropIndex('messages_receiver_id_is_read_index');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_updated_at_index');
            $table->dropIndex('bookings_customer_id_index');
            $table->dropIndex('bookings_vendor_id_index');
        });
    }
};
