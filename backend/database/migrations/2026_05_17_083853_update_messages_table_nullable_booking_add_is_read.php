<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the existing NOT NULL foreign key constraint, make it nullable, re-add FK
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['booking_id']);
        });
        DB::statement('ALTER TABLE messages MODIFY booking_id BIGINT UNSIGNED NULL');
        Schema::table('messages', function (Blueprint $table) {
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->boolean('is_read')->default(false)->after('message');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('is_read');
            $table->dropForeign(['booking_id']);
        });
        DB::statement('ALTER TABLE messages MODIFY booking_id BIGINT UNSIGNED NOT NULL');
        Schema::table('messages', function (Blueprint $table) {
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
        });
    }
};
