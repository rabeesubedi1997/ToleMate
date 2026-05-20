<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'vendor_reply')) {
                $table->text('vendor_reply')->nullable();
            }
            if (!Schema::hasColumn('reviews', 'vendor_replied_at')) {
                $table->timestamp('vendor_replied_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['vendor_reply', 'vendor_replied_at']);
        });
    }
};
