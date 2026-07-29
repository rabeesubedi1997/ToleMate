<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->string('path');
            $table->string('icon')->nullable();
            $table->integer('order')->default(0);
            $table->foreignId('parent_id')->nullable()->constrained('menus')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->string('role')->nullable()->comment('null=all, or customer/vendor/admin/super_admin');
            $table->timestamps();
        });

        Schema::create('page_seo', function (Blueprint $table) {
            $table->id();
            $table->string('page')->unique()->comment('Route path like /services or /about');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->text('keywords')->nullable();
            $table->string('og_image')->nullable();
            $table->boolean('no_index')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_seo');
        Schema::dropIfExists('menus');
    }
};
