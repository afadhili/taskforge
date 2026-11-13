import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeContext';
import type { User } from '@/types';
import { toast } from '@/components/ToastContext';

interface SettingsPageProps {
  user: User;
  workspaceId: number;
}

export function SettingsPage({ user, workspaceId }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();

  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const profileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      const res = await api.patch('/auth/profile', data);
      return res.data.data;
    },
    onSuccess: (updatedUser) => {
      qc.setQueryData(['user'], updatedUser);
      toast('success', 'Profile updated');
      setProfileSaved(true);
      setProfileError('');
    },
    onError: () => {
      setProfileError('Failed to update profile. Please try again.');
      toast('error', 'Update failed', 'Check your connection and try again.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { current_password: string; password: string; password_confirmation: string }) => {
      const res = await api.put('/auth/password', data);
      return res.data;
    },
    onSuccess: () => {
      toast('success', 'Password changed', 'Your session stays active.');
      setPasswordSaved(true);
      setPasswordError('');
      setPasswordSaved(false);
    },
    onError: () => {
      setPasswordError('Current password is incorrect, or the new password does not meet the requirements.');
      toast('error', 'Password update failed', 'Please check your credentials.');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await api.post(`/workspaces/${workspaceId}/invitations`, data);
      return res.data.data.accept_token;
    },
    onSuccess: (acceptToken) => {
      setInviteUrl(`${window.location.origin}/invite/${acceptToken}`);
      setInviteError('');
      toast('success', 'Invitation sent');
    },
    onError: () => {
      setInviteError('Failed to send invitation. The email may not exist or the user is already a member.');
      toast('error', 'Invite failed', 'Check the email address and try again.');
    },
  });

  const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    profileMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    passwordMutation.mutate({
      current_password: formData.get('current_password') as string,
      password: formData.get('password') as string,
      password_confirmation: formData.get('password_confirmation') as string,
    });
  };

  const handleInviteSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    inviteMutation.mutate({
      email: formData.get('email') as string,
      role: formData.get('role') as string,
    });
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => setCopied(true));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">Settings</p>
          <h1 className="tf-page-head-title">Profile & settings</h1>
          <p className="tf-page-head-desc">Manage your account, security, and team access.</p>
        </div>
      </div>

      <div className="tf-settings-grid">
        {/* Profile */}
        <section className="tf-settings-section">
          <h2 className="tf-settings-title">Profile</h2>
          <form className="tf-settings-form" onSubmit={handleProfileSubmit}>
            <div className="tf-form-group">
              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                name="name"
                type="text"
                className="tf-form-input"
                defaultValue={user.name}
                required
              />
            </div>
            <div className="tf-form-group">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                name="email"
                type="email"
                className="tf-form-input"
                defaultValue={user.email}
                required
              />
            </div>
            {profileError && <p className="tf-error-text">{profileError}</p>}
            {profileSaved && <p className="tf-success-text">Profile saved.</p>}
            <div className="tf-form-actions">
              <Button type="submit" variant="default" disabled={profileMutation.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </section>

        <div className="tf-settings-divider" />

        {/* Password */}
        <section className="tf-settings-section">
          <h2 className="tf-settings-title">Security</h2>
          <form className="tf-settings-form" onSubmit={handlePasswordSubmit}>
            <h3 className="tf-settings-subtitle">Change password</h3>
            <div className="tf-form-group">
              <label htmlFor="password-current">Current password</label>
              <input
                id="password-current"
                name="current_password"
                type="password"
                className="tf-form-input"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="tf-form-group">
              <label htmlFor="password-new">New password</label>
              <input
                id="password-new"
                name="password"
                type="password"
                className="tf-form-input"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </div>
            <div className="tf-form-group">
              <label htmlFor="password-confirm">Confirm new password</label>
              <input
                id="password-confirm"
                name="password_confirmation"
                type="password"
                className="tf-form-input"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </div>
            {passwordError && <p className="tf-error-text">{passwordError}</p>}
            {passwordSaved && <p className="tf-success-text">Password changed. Your session stays active.</p>}
            <div className="tf-form-actions">
              <Button type="submit" variant="default" disabled={passwordMutation.isPending}>
                Update password
              </Button>
            </div>
          </form>
        </section>

        <div className="tf-settings-divider" />

        {/* Team */}
        <section className="tf-settings-section">
          <h2 className="tf-settings-title">Team</h2>
          <form className="tf-settings-form" onSubmit={handleInviteSubmit}>
            <h3 className="tf-settings-subtitle">Invite a teammate</h3>
            <div className="tf-form-group">
              <label htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                name="email"
                type="email"
                className="tf-form-input"
                placeholder="teammate@company.com"
                required
              />
            </div>
            <div className="tf-form-group">
              <label htmlFor="invite-role">Workspace role</label>
              <select
                id="invite-role"
                name="role"
                className="tf-form-select"
                defaultValue="member"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {inviteError && <p className="tf-error-text">{inviteError}</p>}
            {inviteUrl && (
              <div className="tf-invite-result">
                <p>Invitation link (expires in 7 days):</p>
                <input readOnly value={inviteUrl} />
                <Button type="button" variant="secondary" onClick={handleCopyInvite}>
                  {copied ? 'Copied' : 'Copy invite link'}
                </Button>
              </div>
            )}
            <div className="tf-form-actions">
              <Button type="submit" variant="default" disabled={inviteMutation.isPending}>
                Create invitation
              </Button>
            </div>
          </form>
        </section>

        <div className="tf-settings-divider" />

        {/* Appearance */}
        <section className="tf-settings-section">
          <h2 className="tf-settings-title">Appearance</h2>
          <form className="tf-settings-form">
            <h3 className="tf-settings-subtitle">Theme</h3>
            <div className="tf-theme-options">
              <label className={`tf-theme-option ${theme === 'light' ? 'tf-theme-option--active' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                />
                <span className="tf-theme-option-label">Light</span>
              </label>
              <label className={`tf-theme-option ${theme === 'dark' ? 'tf-theme-option--active' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={() => setTheme('dark')}
                />
                <span className="tf-theme-option-label">Dark</span>
              </label>
              <label className={`tf-theme-option ${theme === 'system' ? 'tf-theme-option--active' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={theme === 'system'}
                  onChange={() => setTheme('system')}
                />
                <span className="tf-theme-option-label">System</span>
              </label>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
