<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('reschedule_requested_at')->nullable()->after('scheduled_time');
            $table->dateTime('reschedule_to')->nullable()->after('reschedule_requested_at');
            $table->enum('reschedule_status', ['pending', 'accepted', 'declined'])->nullable()->after('reschedule_to');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['reschedule_requested_at', 'reschedule_to', 'reschedule_status']);
        });
    }
};
