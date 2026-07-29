<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained()->onDelete('cascade');
            $table->string('type');
            $table->string('file_path');
            $table->string('status')->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->string('kyc_status')->default('not_submitted')->after('is_verified');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_documents');

        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn('kyc_status');
        });
    }
};
