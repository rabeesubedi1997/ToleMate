<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('request_bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('booking_requests')->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->decimal('offered_price', 10, 2)->nullable(); // null = accept customer budget as-is
            $table->string('note', 500)->nullable();
            $table->enum('status', ['pending', 'accepted', 'declined', 'withdrawn'])->default('pending');
            $table->timestamp('expires_at')->nullable(); // 2 hours from creation
            $table->timestamps();

            $table->unique(['request_id', 'vendor_id']); // one bid per vendor per request
            $table->index(['request_id', 'status']);
            $table->index(['vendor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_bids');
    }
};
