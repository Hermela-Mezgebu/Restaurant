<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        /*
         * Generate slugs for existing restaurants.
         *
         * This is intentionally done after adding the column because
         * existing rows may already be present.
         */
        $restaurants = \DB::table('restaurants')
            ->select('id', 'name')
            ->get();

        foreach ($restaurants as $restaurant) {
            $baseSlug = \Illuminate\Support\Str::slug($restaurant->name);

            if ($baseSlug === '') {
                $baseSlug = 'restaurant';
            }

            $slug = $baseSlug;
            $counter = 2;

            while (
                \DB::table('restaurants')
                    ->where('slug', $slug)
                    ->where('id', '!=', $restaurant->id)
                    ->exists()
            ) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }

            \DB::table('restaurants')
                ->where('id', $restaurant->id)
                ->update([
                    'slug' => $slug,
                ]);
        }

        /*
         * Make the column unique after existing records
         * have received their slugs.
         */
        Schema::table('restaurants', function (Blueprint $table) {
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};