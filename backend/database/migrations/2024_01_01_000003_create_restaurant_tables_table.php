<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();

            // Restaurant owner / manager
            $table->foreignId('owner_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Basic information
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();

            // Restaurant details
            $table->string('cuisine')->nullable();
            $table->string('price_range', 10)->nullable();

            // Contact information
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();

            // Location
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('area')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Images
            $table->string('logo')->nullable();
            $table->string('cover_image')->nullable();

            // Restaurant state
            $table->enum('status', [
                'active',
                'inactive',
                'suspended',
            ])->default('active');

            // Admin approval
            $table->enum('approval_status', [
                'pending',
                'approved',
                'rejected',
            ])->default('pending');

            // Optional rejection reason
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            // Useful indexes
            $table->index('city');
            $table->index('area');
            $table->index('cuisine');
            $table->index('status');
            $table->index('approval_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurants');
    }
};