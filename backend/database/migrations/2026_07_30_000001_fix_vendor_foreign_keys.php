<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix bookings.vendor_id FK — currently references users, should reference vendors
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->foreign('vendor_id')->references('id')->on('vendors')->onDelete('cascade');
        });

        // Fix reviews.vendor_id FK — currently references users, should reference vendors
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->foreign('vendor_id')->references('id')->on('vendors')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->foreign('vendor_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->foreign('vendor_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
