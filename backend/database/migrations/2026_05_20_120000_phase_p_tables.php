<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            if (!Schema::hasColumn('services', 'sale_price')) {
                $table->decimal('sale_price', 10, 2)->nullable()->after('price');
            }
            if (!Schema::hasColumn('services', 'sale_ends_at')) {
                $table->timestamp('sale_ends_at')->nullable()->after('sale_price');
            }
        });

        Schema::create('vendor_portfolio', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vendor_id');
            $table->string('image_url');
            $table->string('before_image_url')->nullable();
            $table->string('caption')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });

        Schema::create('vendor_badges', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vendor_id')->unique();
            $table->boolean('top_rated')->default(false);
            $table->boolean('fast_responder')->default(false);
            $table->boolean('verified_pro')->default(false);
            $table->boolean('popular')->default(false);
            $table->boolean('new_vendor')->default(false);
            $table->timestamps();
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });

        Schema::create('service_bundles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vendor_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('service_ids'); // array of service IDs in this bundle
            $table->decimal('bundle_price', 10, 2); // total price for the bundle
            $table->unsignedInteger('discount_percent')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['sale_price', 'sale_ends_at']);
        });
        Schema::dropIfExists('service_bundles');
        Schema::dropIfExists('vendor_badges');
        Schema::dropIfExists('vendor_portfolio');
    }
};
