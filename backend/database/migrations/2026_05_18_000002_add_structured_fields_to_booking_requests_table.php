<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_requests', function (Blueprint $table) {
            $table->string('title')->after('text');
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete()->after('title');
            $table->decimal('budget', 10, 2)->nullable()->after('category_id');
            $table->dateTime('preferred_date')->nullable()->after('budget');
            $table->enum('urgency', ['asap', 'this_week', 'this_month', 'flexible'])->default('flexible')->after('preferred_date');
        });
    }

    public function down(): void
    {
        Schema::table('booking_requests', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn(['title', 'category_id', 'budget', 'preferred_date', 'urgency']);
        });
    }
};
