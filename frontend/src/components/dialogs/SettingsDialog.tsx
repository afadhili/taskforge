import { useEffect, useState, type FormEvent } from "react";
import { Camera, Check, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, setToken } from "@/api";
import { message } from "@/lib/errors";
import { useApp } from "@/components/app-context";
import { useTheme } from "@/components/ThemeContext";
import { useProjectMembers } from "@/lib/project";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { User } from "@/types";

function InviteTeammate({ workspaceId }: { workspaceId: number }) {
  const [role, setRole] = useState("member");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await api.post<{
        data: { accept_token: string };
      }>(`/workspaces/${workspaceId}/invitations`, {
        email: form.get("email"),
        role,
      });
      setInviteUrl(
        `${window.location.origin}/invite/${response.data.data.accept_token}`,
      );
      setCopied(false);
      setError("");
      toast.success("Invitation created.");
    } catch (reason) {
      setError(message(reason).message);
    }
  };

  return (
    <section className="grid gap-4">
      <h3 className="text-sm font-semibold">Invite a teammate</h3>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-role">Workspace role</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value ?? "member")}
          >
            <SelectTrigger id="invite-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit">Create invitation</Button>
      </form>
      {inviteUrl && (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Invitation link (expires in 7 days):
          </p>
          <Input readOnly value={inviteUrl} />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(inviteUrl)
                .then(() => setCopied(true))
                .catch(() => toast.error("Could not copy the link."))
            }
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy invite link"}
          </Button>
        </div>
      )}
    </section>
  );
}

function MembersList({ workspaceId }: { workspaceId: number }) {
  const {
    data: members,
    isLoading,
    isError,
    error,
  } = useProjectMembers(workspaceId);
  const list = members ?? [];

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">Members</h3>
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading members…
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{message(error).message}</AlertDescription>
        </Alert>
      ) : (
        <ul className="grid gap-2">
          {list.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <UserAvatar
                name={member.name}
                src={member.avatar_url}
                className="size-8"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {member.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {member.email}
                </span>
              </span>
            </li>
          ))}
          {!list.length && (
            <li className="text-sm text-muted-foreground">No members yet.</li>
          )}
        </ul>
      )}
    </section>
  );
}

export function SettingsDialog({
  open,
  close,
}: {
  open: boolean;
  close: () => void;
}) {
  const { user, setUser, workspace } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const profile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      const result = await api.patch<{ data: User }>("/auth/profile", payload);
      setUser(result.data.data);
      setProfileSaved(true);
      setProfileError("");
      toast.success("Profile saved.");
    } catch (reason) {
      setProfileError(message(reason).message);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const result = await api.post<{ data: User }>(
        "/auth/profile/avatar",
        formData,
      );
      setUser(result.data.data);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profile picture updated.");
    } catch (reason) {
      setAvatarError(message(reason).message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const result = await api.delete<{ data: User }>("/auth/profile/avatar");
      setUser(result.data.data);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profile picture removed.");
    } catch (reason) {
      setAvatarError(message(reason).message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const password = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api.put<{ data: { token: string } }>(
        "/auth/password",
        payload,
      );
      setToken(result.data.data.token);
      setPasswordSaved(true);
      setPasswordError("");
      form.reset();
      toast.success("Password changed. Your session stays active.");
    } catch (reason) {
      setPasswordError(message(reason).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile &amp; settings</DialogTitle>
          <DialogDescription>
            Manage your account, teammates, and appearance.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 rounded-xl border bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={user.name}
              src={avatarPreview ?? user.avatar_url}
              className="size-16"
              fallbackClassName="text-lg font-semibold"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Profile picture</h3>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {avatarFile ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void uploadAvatar()}
                    disabled={avatarBusy}
                  >
                    {avatarBusy ? <Spinner /> : <Camera />}
                    Save picture
                  </Button>
                ) : user.has_custom_avatar ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void removeAvatar()}
                    disabled={avatarBusy}
                  >
                    {avatarBusy ? <Spinner /> : <Trash2 />}
                    Remove picture
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <Input
            id="profile-avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose a profile picture"
            disabled={avatarBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              event.currentTarget.value = "";
              if (file && file.size > 2 * 1024 * 1024) {
                setAvatarFile(null);
                setAvatarPreview(null);
                setAvatarError("Choose an image smaller than 2 MB.");
                return;
              }
              setAvatarError("");
              setAvatarFile(file);
              setAvatarPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP · maximum 2 MB
          </p>
          {avatarError && (
            <Alert variant="destructive">
              <AlertDescription>{avatarError}</AlertDescription>
            </Alert>
          )}
        </section>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Sign-in method</p>
            <p className="text-xs text-muted-foreground">
              {user.oauth_provider
                ? `Connected with ${user.oauth_provider === "github" ? "GitHub" : "Google"}`
                : "Email and password"}
            </p>
          </div>
          <Badge variant="secondary">
            {user.oauth_provider ? "Social account" : "Password account"}
          </Badge>
        </div>

        <form className="grid gap-4" onSubmit={profile}>
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              name="name"
              required
              defaultValue={user.name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
            />
          </div>
          {profileError && (
            <Alert variant="destructive">
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}
          {profileSaved && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Profile saved.
            </p>
          )}
          <Button type="submit">Save profile</Button>
        </form>

        {!user.oauth_provider && (
          <>
            <Separator />
            <form className="grid gap-4" onSubmit={password}>
              <h3 className="text-sm font-semibold">Change password</h3>
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  name="current_password"
                  type="password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="password"
                  type="password"
                  minLength={10}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  name="password_confirmation"
                  type="password"
                  minLength={10}
                  required
                />
              </div>
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {passwordSaved && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Password changed. Your session stays active.
                </p>
              )}
              <Button type="submit" variant="secondary">
                Update password
              </Button>
            </form>
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="grid">
            <Label htmlFor="dark-theme">Dark theme</Label>
            <p className="text-xs text-muted-foreground">
              Currently using {resolvedTheme} mode.
            </p>
          </div>
          <Switch
            id="dark-theme"
            checked={resolvedTheme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>

        <Separator />

        {workspace.id > 0 && (
          <>
            <InviteTeammate workspaceId={workspace.id} />
            <Separator />
            <MembersList workspaceId={workspace.id} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
