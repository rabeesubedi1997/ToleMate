<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            if (!Schema::hasColumn('vendors', 'service_radius_km')) {
                $table->unsignedInteger('service_radius_km')->nullable();
            }
            if (!Schema::hasColumn('vendors', 'subscription_plan')) {
                $table->enum('subscription_plan', ['free', 'basic', 'pro'])->default('free');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'referral_code')) {
                $table->string('referral_code', 10)->nullable()->unique();
            }
            if (!Schema::hasColumn('users', 'referred_by')) {
                $table->unsignedBigInteger('referred_by')->nullable();
                $table->foreign('referred_by')->references('id')->on('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'loyalty_points')) {
                $table->unsignedInteger('loyalty_points')->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn(['service_radius_km', 'subscription_plan']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['referred_by']);
            $table->dropColumn(['referral_code', 'referred_by', 'loyalty_points']);
        });
    }
};
