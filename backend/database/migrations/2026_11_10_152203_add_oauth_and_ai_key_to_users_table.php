<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('oauth_provider')->nullable();
            $table->string('oauth_provider_id')->nullable();
            $table->text('ai_api_key')->nullable();
            $table->unique(['oauth_provider', 'oauth_provider_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['oauth_provider', 'oauth_provider_id']);
            $table->dropColumn(['oauth_provider', 'oauth_provider_id', 'ai_api_key']);
        });
    }
};
