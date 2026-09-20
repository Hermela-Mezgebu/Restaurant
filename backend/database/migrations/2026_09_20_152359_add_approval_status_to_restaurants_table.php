<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            if (!Schema::hasColumn('restaurants', 'is_active')) {
                $table
                    ->boolean('is_active')
                    ->default(false)
                    ->after('approved');
            }

            if (!Schema::hasColumn('restaurants', 'rejection_reason')) {
                $table
                    ->text('rejection_reason')
                    ->nullable()
                    ->after('is_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            if (Schema::hasColumn('restaurants', 'rejection_reason')) {
                $table->dropColumn('rejection_reason');
            }

            if (Schema::hasColumn('restaurants', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};