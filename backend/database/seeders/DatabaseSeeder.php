<?php

namespace Database\Seeders;

use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Models\MenuItem;
use App\Models\Review;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@restaurant.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'phone' => '555-0100',
        ]);

        // Diner users
        $diner1 = User::create([
            'name' => 'John Diner',
            'email' => 'john@example.com',
            'password' => Hash::make('password'),
            'role' => 'diner',
            'phone' => '555-0101',
        ]);

        $diner2 = User::create([
            'name' => 'Jane Diner',
            'email' => 'jane@example.com',
            'password' => Hash::make('password'),
            'role' => 'diner',
            'phone' => '555-0102',
        ]);

        $diner3 = User::create([
            'name' => 'Bob Diner',
            'email' => 'bob@example.com',
            'password' => Hash::make('password'),
            'role' => 'diner',
            'phone' => '555-0103',
        ]);

        // Restaurants
        $restaurant1 = Restaurant::create([
            'name' => 'Bella Italia',
            'description' => 'Authentic Italian cuisine in the heart of the city. Our chefs bring generations of family recipes to life with the freshest ingredients imported from Italy. Enjoy handmade pasta, wood-fired pizzas, and an extensive wine list in our warm, inviting atmosphere.',
            'cuisine_type' => 'Italian',
            'price_range' => 3,
            'address' => '123 Main Street',
            'city' => 'New York',
            'state' => 'NY',
            'zip' => '10001',
            'phone' => '212-555-1001',
            'email' => 'info@bellaitalia.com',
            'hours' => json_encode([
                'monday' => ['open' => '11:00', 'close' => '22:00'],
                'tuesday' => ['open' => '11:00', 'close' => '22:00'],
                'wednesday' => ['open' => '11:00', 'close' => '22:00'],
                'thursday' => ['open' => '11:00', 'close' => '22:00'],
                'friday' => ['open' => '11:00', 'close' => '23:00'],
                'saturday' => ['open' => '10:00', 'close' => '23:00'],
                'sunday' => ['open' => '10:00', 'close' => '21:00'],
            ]),
            'photos' => json_encode([
                'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
            ]),
            'is_active' => true,
            'approved' => true,
        ]);

        $staff1 = User::create([
            'name' => 'Marco Staff',
            'email' => 'marco@bellaitalia.com',
            'password' => Hash::make('password'),
            'role' => 'staff',
            'phone' => '555-0201',
            'restaurant_id' => $restaurant1->id,
        ]);

        $restaurant2 = Restaurant::create([
            'name' => 'Sakura Sushi',
            'description' => 'Premium Japanese dining experience featuring the freshest sushi and sashimi. Our master chefs trained in Tokyo bring authentic flavors to every dish. Enjoy our omakase experience or choose from our extensive à la carte menu.',
            'cuisine_type' => 'Japanese',
            'price_range' => 4,
            'address' => '456 Park Avenue',
            'city' => 'New York',
            'state' => 'NY',
            'zip' => '10022',
            'phone' => '212-555-2002',
            'email' => 'info@sakurasushi.com',
            'hours' => json_encode([
                'monday' => ['open' => '12:00', 'close' => '22:00'],
                'tuesday' => ['open' => '12:00', 'close' => '22:00'],
                'wednesday' => ['open' => '12:00', 'close' => '22:00'],
                'thursday' => ['open' => '12:00', 'close' => '22:00'],
                'friday' => ['open' => '12:00', 'close' => '23:00'],
                'saturday' => ['open' => '12:00', 'close' => '23:00'],
                'sunday' => ['open' => '12:00', 'close' => '21:00'],
            ]),
            'photos' => json_encode([
                'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800',
                'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800',
            ]),
            'is_active' => true,
            'approved' => true,
        ]);

        $staff2 = User::create([
            'name' => 'Yuki Staff',
            'email' => 'yuki@sakurasushi.com',
            'password' => Hash::make('password'),
            'role' => 'staff',
            'phone' => '555-0202',
            'restaurant_id' => $restaurant2->id,
        ]);

        $restaurant3 = Restaurant::create([
            'name' => 'El Patron',
            'description' => 'Vibrant Mexican cuisine with a modern twist. From street tacos to signature margaritas, every dish celebrates the rich flavors of Mexico. Our lively atmosphere and colorful décor make every meal a fiesta.',
            'cuisine_type' => 'Mexican',
            'price_range' => 2,
            'address' => '789 Broadway',
            'city' => 'New York',
            'state' => 'NY',
            'zip' => '10003',
            'phone' => '212-555-3003',
            'email' => 'info@elpatron.com',
            'hours' => json_encode([
                'monday' => ['open' => '11:00', 'close' => '22:00'],
                'tuesday' => ['open' => '11:00', 'close' => '22:00'],
                'wednesday' => ['open' => '11:00', 'close' => '22:00'],
                'thursday' => ['open' => '11:00', 'close' => '22:00'],
                'friday' => ['open' => '11:00', 'close' => '00:00'],
                'saturday' => ['open' => '10:00', 'close' => '00:00'],
                'sunday' => ['open' => '10:00', 'close' => '22:00'],
            ]),
            'photos' => json_encode([
                'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
                'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
            ]),
            'is_active' => true,
            'approved' => true,
        ]);

        $staff3 = User::create([
            'name' => 'Carlos Staff',
            'email' => 'carlos@elpatron.com',
            'password' => Hash::make('password'),
            'role' => 'staff',
            'phone' => '555-0203',
            'restaurant_id' => $restaurant3->id,
        ]);

        $restaurant4 = Restaurant::create([
            'name' => 'Le Bistro',
            'description' => 'Classic French bistro serving traditional Parisian fare in an elegant setting. Our chef-trained kitchen creates timeless dishes like coq au vin, bouillabaisse, and crème brûlée with impeccable technique.',
            'cuisine_type' => 'French',
            'price_range' => 4,
            'address' => '321 Fifth Avenue',
            'city' => 'New York',
            'state' => 'NY',
            'zip' => '10016',
            'phone' => '212-555-4004',
            'email' => 'info@lebistro.com',
            'hours' => json_encode([
                'monday' => ['open' => '17:00', 'close' => '22:00'],
                'tuesday' => ['open' => '17:00', 'close' => '22:00'],
                'wednesday' => ['open' => '17:00', 'close' => '22:00'],
                'thursday' => ['open' => '17:00', 'close' => '22:00'],
                'friday' => ['open' => '17:00', 'close' => '23:00'],
                'saturday' => ['open' => '17:00', 'close' => '23:00'],
                'sunday' => ['open' => '17:00', 'close' => '21:00'],
            ]),
            'photos' => json_encode([
                'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
                'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
            ]),
            'is_active' => true,
            'approved' => true,
        ]);

        $restaurant5 = Restaurant::create([
            'name' => 'Spice Garden',
            'description' => 'A journey through Indian cuisine with aromatic spices and traditional cooking methods. From butter chicken to biryani, our dishes are crafted with authentic recipes passed down through generations.',
            'cuisine_type' => 'Indian',
            'price_range' => 2,
            'address' => '555 Lexington Avenue',
            'city' => 'New York',
            'state' => 'NY',
            'zip' => '10017',
            'phone' => '212-555-5005',
            'email' => 'info@spicegarden.com',
            'hours' => json_encode([
                'monday' => ['open' => '11:30', 'close' => '22:00'],
                'tuesday' => ['open' => '11:30', 'close' => '22:00'],
                'wednesday' => ['open' => '11:30', 'close' => '22:00'],
                'thursday' => ['open' => '11:30', 'close' => '22:00'],
                'friday' => ['open' => '11:30', 'close' => '23:00'],
                'saturday' => ['open' => '11:30', 'close' => '23:00'],
                'sunday' => ['open' => '11:30', 'close' => '21:00'],
            ]),
            'photos' => json_encode([
                'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
                'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800',
            ]),
            'is_active' => true,
            'approved' => true,
        ]);

        $restaurant6 = Restaurant::create([
            'name' => 'The Grill House',
            'description' => 'American steakhouse featuring premium cuts of beef, fresh seafood, and craft cocktails. Our dry-aged steaks are grilled to perfection over an open flame in a sophisticated yet comfortable setting.',
            'cuisine_type' => 'American',
            'price_range' => 3,
            'address' => '777 Seventh Avenue',
            'city' => 'New York',
            'state' => 'NY',
            'zip' => '10019',
            'phone' => '212-555-6006',
            'email' => 'info@grillhouse.com',
            'hours' => json_encode([
                'monday' => ['open' => '11:00', 'close' => '22:00'],
                'tuesday' => ['open' => '11:00', 'close' => '22:00'],
                'wednesday' => ['open' => '11:00', 'close' => '22:00'],
                'thursday' => ['open' => '11:00', 'close' => '22:00'],
                'friday' => ['open' => '11:00', 'close' => '23:00'],
                'saturday' => ['open' => '10:00', 'close' => '23:00'],
                'sunday' => ['open' => '10:00', 'close' => '22:00'],
            ]),
            'photos' => json_encode([
                'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800',
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
            ]),
            'is_active' => true,
            'approved' => false,
        ]);

        $restaurants = [$restaurant1, $restaurant2, $restaurant3, $restaurant4, $restaurant5, $restaurant6];

        // Tables for each restaurant
        $seatingTypes = ['standard', 'outdoor', 'bar'];
        foreach ($restaurants as $restaurant) {
            $tableNum = 1;
            for ($i = 0; $i < 8; $i++) {
                $capacity = [2, 2, 4, 4, 4, 6, 6, 8][$i];
                $seating = $seatingTypes[array_rand($seatingTypes)];
                RestaurantTable::create([
                    'restaurant_id' => $restaurant->id,
                    'table_number' => $tableNum++,
                    'capacity' => $capacity,
                    'seating_type' => $seating,
                    'status' => 'available',
                ]);
            }
        }

        // Menu items for each restaurant
        $menuCategories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages'];
        $menuItems = [
            'Italian' => [
                'Appetizers' => ['Bruschetta' => 12.99, 'Calamari Fritti' => 14.99, 'Caprese Salad' => 11.99, 'Garlic Bread' => 8.99],
                'Main Course' => ['Spaghetti Carbonara' => 18.99, 'Margherita Pizza' => 16.99, 'Chicken Parmesan' => 22.99, 'Osso Buco' => 32.99],
                'Desserts' => ['Tiramisu' => 9.99, 'Panna Cotta' => 8.99, 'Gelato' => 7.99],
                'Beverages' => ['Espresso' => 3.99, 'Cappuccino' => 4.99, 'Italian Wine' => 12.99, 'San Pellegrino' => 5.99],
            ],
            'Japanese' => [
                'Appetizers' => ['Edamame' => 6.99, 'Miso Soup' => 4.99, 'Gyoza' => 8.99, 'Seaweed Salad' => 7.99],
                'Main Course' => ['Sushi Platter' => 28.99, 'Salmon Teriyaki' => 24.99, 'Tempura Udon' => 18.99, 'Chicken Katsu' => 19.99],
                'Desserts' => ['Mochi Ice Cream' => 6.99, 'Green Tea Cake' => 8.99, 'Dorayaki' => 7.99],
                'Beverages' => ['Green Tea' => 3.99, 'Sake' => 10.99, 'Japanese Beer' => 7.99, 'Ramune' => 4.99],
            ],
            'Mexican' => [
                'Appetizers' => ['Guacamole & Chips' => 9.99, 'Quesadilla' => 10.99, 'Nachos Supreme' => 12.99, 'Elote' => 6.99],
                'Main Course' => ['Tacos al Pastor' => 15.99, 'Enchiladas' => 16.99, 'Burrito Grande' => 17.99, 'Fajitas' => 21.99],
                'Desserts' => ['Churros' => 7.99, 'Flan' => 8.99, 'Tres Leches' => 9.99],
                'Beverages' => ['Margarita' => 11.99, 'Horchata' => 4.99, 'Mexican Beer' => 6.99, 'Agua Fresca' => 3.99],
            ],
            'French' => [
                'Appetizers' => ['Escargots' => 14.99, 'French Onion Soup' => 11.99, 'Foie Gras' => 24.99, 'Salade Niçoise' => 13.99],
                'Main Course' => ['Coq au Vin' => 28.99, 'Bouillabaisse' => 32.99, 'Steak Frites' => 34.99, 'Duck Confit' => 29.99],
                'Desserts' => ['Crème Brûlée' => 9.99, 'Chocolate Mousse' => 10.99, 'Macarons' => 8.99],
                'Beverages' => ['French Wine' => 14.99, 'Champagne' => 18.99, 'Espresso' => 4.99, 'Kir Royale' => 12.99],
            ],
            'Indian' => [
                'Appetizers' => ['Samosas' => 7.99, 'Onion Bhaji' => 6.99, 'Papdi Chaat' => 8.99, 'Tandoori Chicken' => 12.99],
                'Main Course' => ['Butter Chicken' => 18.99, 'Lamb Biryani' => 19.99, 'Palak Paneer' => 16.99, 'Chicken Tikka Masala' => 17.99],
                'Desserts' => ['Gulab Jamun' => 6.99, 'Mango Lassi' => 5.99, 'Kheer' => 6.99],
                'Beverages' => ['Masala Chai' => 3.99, 'Mango Lassi' => 5.99, 'Indian Beer' => 6.99, 'Nimbu Pani' => 3.99],
            ],
            'American' => [
                'Appetizers' => ['Caesar Salad' => 10.99, 'Buffalo Wings' => 12.99, 'Loaded Fries' => 9.99, 'Shrimp Cocktail' => 14.99],
                'Main Course' => ['Ribeye Steak' => 38.99, 'BBQ Ribs' => 28.99, 'Grilled Salmon' => 26.99, 'Classic Burger' => 17.99],
                'Desserts' => ['Cheesecake' => 9.99, 'Apple Pie' => 8.99, 'Brownie Sundae' => 10.99],
                'Beverages' => ['Craft Beer' => 7.99, 'Old Fashioned' => 14.99, 'Wine' => 10.99, 'Milkshake' => 6.99],
            ],
        ];

        $cuisineMap = [
            'Italian' => 'Italian', 'Japanese' => 'Japanese', 'Mexican' => 'Mexican',
            'French' => 'French', 'Indian' => 'Indian', 'American' => 'American',
        ];

        foreach ($restaurants as $restaurant) {
            $cuisine = $cuisineMap[$restaurant->cuisine_type] ?? 'American';
            $items = $menuItems[$cuisine];
            foreach ($items as $category => $dishes) {
                foreach ($dishes as $name => $price) {
                    MenuItem::create([
                        'restaurant_id' => $restaurant->id,
                        'name' => $name,
                        'description' => "Delicious $name prepared with the finest ingredients.",
                        'price' => $price,
                        'category' => $category,
                        'is_available' => true,
                    ]);
                }
            }
        }

        // Reviews
        $reviews = [
            ['Bella Italia' => ['Amazing pasta! Best Italian in NYC.', 'The carbonara was perfect. Great service!', 'Romantic atmosphere, wonderful wine selection.']],
            ['Sakura Sushi' => ['Freshest sushi in town!', 'Omakase experience was unforgettable.', 'The chef is a true artist. Incredible quality.']],
            ['El Patron' => ['Best tacos and margaritas!', 'Fun atmosphere, great for groups.', 'Authentic flavors, generous portions.']],
            ['Le Bistro' => ['Exquisite French cuisine.', 'A taste of Paris in NYC. Divine.', 'The duck confit is a must-try.']],
            ['Spice Garden' => ['Incredible flavors, authentic Indian food.', 'Butter chicken is amazing. Great service!', 'Beautiful ambiance and delicious food.']],
            ['The Grill House' => ['Perfectly cooked steaks every time.', 'The ribeye is phenomenal!', 'Great whiskey selection and service.']],
        ];

        $diners = [$diner1, $diner2, $diner3];
        foreach ($restaurants as $index => $restaurant) {
            $restaurantReviews = $reviews[$index][$restaurant->name] ?? [];
            foreach ($restaurantReviews as $i => $comment) {
                $diner = $diners[$i % count($diners)];
                Review::create([
                    'user_id' => $diner->id,
                    'restaurant_id' => $restaurant->id,
                    'rating' => rand(4, 5),
                    'comment' => $comment,
                ]);
            }
        }

        // Past reservations
        $pastDate = now()->subDays(rand(1, 30));
        Reservation::create([
            'user_id' => $diner1->id,
            'restaurant_id' => $restaurant1->id,
            'table_id' => $restaurant1->tables->first()->id,
            'party_size' => 2,
            'reservation_date' => $pastDate->format('Y-m-d'),
            'reservation_time' => '19:00',
            'status' => 'completed',
            'notes' => 'Anniversary dinner',
        ]);

        Reservation::create([
            'user_id' => $diner2->id,
            'restaurant_id' => $restaurant2->id,
            'table_id' => $restaurant2->tables->skip(1)->first()->id,
            'party_size' => 4,
            'reservation_date' => $pastDate->subDays(5)->format('Y-m-d'),
            'reservation_time' => '20:00',
            'status' => 'completed',
        ]);

        // Future/pending reservations
        $futureDate = now()->addDays(rand(1, 14));
        Reservation::create([
            'user_id' => $diner1->id,
            'restaurant_id' => $restaurant3->id,
            'party_size' => 4,
            'reservation_date' => $futureDate->format('Y-m-d'),
            'reservation_time' => '18:30',
            'status' => 'confirmed',
        ]);

        Reservation::create([
            'user_id' => $diner2->id,
            'restaurant_id' => $restaurant4->id,
            'party_size' => 2,
            'reservation_date' => $futureDate->addDays(1)->format('Y-m-d'),
            'reservation_time' => '19:00',
            'status' => 'pending',
        ]);

        Reservation::create([
            'user_id' => $diner3->id,
            'restaurant_id' => $restaurant1->id,
            'party_size' => 6,
            'reservation_date' => $futureDate->addDays(2)->format('Y-m-d'),
            'reservation_time' => '20:00',
            'status' => 'confirmed',
        ]);

        // Today's reservation for restaurant1 (for staff dashboard demo)
        Reservation::create([
            'user_id' => $diner3->id,
            'restaurant_id' => $restaurant1->id,
            'party_size' => 3,
            'reservation_date' => now()->format('Y-m-d'),
            'reservation_time' => '18:00',
            'status' => 'confirmed',
        ]);

        Reservation::create([
            'user_id' => $diner1->id,
            'restaurant_id' => $restaurant1->id,
            'party_size' => 2,
            'reservation_date' => now()->format('Y-m-d'),
            'reservation_time' => '19:30',
            'status' => 'pending',
        ]);

        Reservation::create([
            'user_id' => $diner2->id,
            'restaurant_id' => $restaurant1->id,
            'party_size' => 4,
            'reservation_date' => now()->format('Y-m-d'),
            'reservation_time' => '20:00',
            'status' => 'confirmed',
        ]);

        echo "Database seeded successfully!\n";
        echo "Admin: admin@restaurant.com / password\n";
        echo "Staff (Bella Italia): marco@bellaitalia.com / password\n";
        echo "Diner: john@example.com / password\n";
    }
}
