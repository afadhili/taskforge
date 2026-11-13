<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with the full demo dataset.
     *
     * The heavy lifting lives in DemoSeeder so the following command reproduces the
     * demo workspace end to end:
     *
     *     php artisan db:seed
     */
    public function run(): void
    {
        $this->call(DemoSeeder::class);
    }
}
