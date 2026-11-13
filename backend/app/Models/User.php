<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'role',
    'ai_api_key',
    'ai_base_url',
    'ai_model',
    'oauth_provider',
    'oauth_provider_id',
    'avatar_path',
    'oauth_avatar_url',
])]
#[Hidden([
    'password',
    'remember_token',
    'api_token',
    'ai_api_key',
    'ai_base_url',
    'ai_model',
    'oauth_provider_id',
])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_admin' => 'boolean',
            'role' => 'string',
            'ai_api_key' => 'encrypted',
        ];
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn (): ?string => $this->avatar_path
                ? Storage::disk('public')->url($this->avatar_path)
                : $this->oauth_avatar_url,
        );
    }

    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function assignedTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assignee_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin || $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || $this->role === 'admin';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner' || $this->isSuperAdmin();
    }

    public function isMember(): bool
    {
        return $this->isAdmin() || $this->role === 'member';
    }

    public function isViewer(): bool
    {
        return $this->role === 'viewer';
    }
}
