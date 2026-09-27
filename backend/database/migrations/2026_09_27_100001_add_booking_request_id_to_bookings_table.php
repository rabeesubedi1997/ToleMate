<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('booking_request_id')->nullable()->after('service_id')
                ->constrained('booking_requests')->nullOnDelete();
        });

        Schema::table('booking_requests', function (Blueprint $table) {
            $table->timestamp('closed_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('booking_request_id');
        });

        Schema::table('booking_requests', function (Blueprint $table) {
            $table->dropColumn('closed_at');
        });
    }
};
