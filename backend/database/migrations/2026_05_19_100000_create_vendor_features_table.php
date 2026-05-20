<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('vendors')->onDelete('cascade');
            $table->string('feature'); // bookings | messaging | services | availability_edit | social_links | reviews
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
            $table->unique(['vendor_id', 'feature']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_features');
    }
};
