<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer','vendor','admin','super_admin') NOT NULL DEFAULT 'customer'");

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('role');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->string('status', 20)->default('approved')->after('is_active');
            $table->text('rejection_reason')->nullable()->after('status');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete()->after('rejection_reason');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        DB::statement("ALTER TABLE services MODIFY COLUMN status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft'");

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action', 100);
            $table->string('subject_type', 100)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['status', 'rejection_reason', 'reviewed_by', 'reviewed_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer','vendor','admin') NOT NULL DEFAULT 'customer'");
    }
};
