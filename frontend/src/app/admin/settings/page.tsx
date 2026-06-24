"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  User2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { ApiError, api, type MyProfile } from "@/lib/api";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, and how Legion looks."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User2 className="mr-1.5 h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound className="mr-1.5 h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-1.5 h-4 w-4" /> Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Light, dark, or follow your system preference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ThemeOption
                  active={theme === "light"}
                  icon={Sun}
                  label="Light"
                  preview="bg-white border-zinc-200"
                  iconWrap="bg-zinc-100 text-zinc-800"
                  onClick={() => setTheme("light")}
                />
                <ThemeOption
                  active={theme === "dark"}
                  icon={Moon}
                  label="Dark"
                  preview="bg-zinc-900 border-zinc-800"
                  iconWrap="bg-zinc-800 text-zinc-100"
                  onClick={() => setTheme("dark")}
                />
                <ThemeOption
                  active={false}
                  icon={Monitor}
                  label="System"
                  preview="bg-gradient-to-br from-white to-zinc-900 border-zinc-300"
                  iconWrap="bg-white/70 text-zinc-700 backdrop-blur"
                  onClick={() => {
                    const prefersDark = window.matchMedia(
                      "(prefers-color-scheme: dark)"
                    ).matches;
                    setTheme(prefersDark ? "dark" : "light");
                    toast.success("Matched system theme");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const queryClient = useQueryClient();
  const meQ = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.get<MyProfile>("/api/users/me"),
  });

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [pushNotif, setPushNotif] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (meQ.data) {
      setName(meQ.data.fullName);
      setPhone(meQ.data.phone ?? "");
    }
  }, [meQ.data]);

  const save = useMutation({
    mutationFn: (req: { displayName: string; phone: string }) =>
      api.put<MyProfile>("/api/users/me/profile", req),
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.postForm<MyProfile>("/api/users/me/avatar", fd);
    },
    onSuccess: () => {
      toast.success("Photo updated");
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      // The member-side page uses a different cache key; refresh that too
      // in case the admin previews it from the same browser session.
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not upload photo";
      toast.error(msg);
    },
  });

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }
    uploadAvatar.mutate(file);
  }

  const email = meQ.data?.email ?? "";

  return (
    <div className="flex flex-col gap-4 mt-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar
              name={name || email || "Admin"}
              size="xl"
              src={meQ.data?.avatarUrl ?? undefined}
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {name || "—"}
              </h2>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, or WebP. Up to 2&nbsp;MB.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={uploadAvatar.isPending || meQ.isLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              Change avatar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onFilePicked}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>
            Update your display name and phone number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ displayName: name.trim(), phone: phone.trim() });
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                disabled={meQ.isLoading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled readOnly />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                maxLength={40}
                disabled={meQ.isLoading}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (meQ.data) {
                    setName(meQ.data.fullName);
                    setPhone(meQ.data.phone ?? "");
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending || meQ.isLoading}>
                {save.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Preferences are stored locally for now.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Row
            title="Email notifications"
            description="Daily digests, new signups, and revenue alerts."
            checked={emailNotif}
            onChange={setEmailNotif}
          />
          <Row
            title="Push notifications"
            description="Real-time bookings and check-ins on mobile."
            checked={pushNotif}
            onChange={setPushNotif}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => toast.message("Notification prefs not persisted yet")}
          >
            Reset
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [showCur, setShowCur] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const change = useMutation({
    mutationFn: (req: { currentPassword: string; newPassword: string }) =>
      api.post<void>("/api/auth/password/change", req),
    onSuccess: () => {
      toast.success(
        "Password updated. You'll need to sign in again on other devices."
      );
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err) =>
      setErrorMsg(
        err instanceof Error ? err.message : "Could not update password"
      ),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (newPw.length < 12) {
      setErrorMsg("New password must be at least 12 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setErrorMsg("New password and confirmation don't match.");
      return;
    }
    change.mutate({ currentPassword: currentPw, newPassword: newPw });
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Use at least 12 characters. After changing, all other sessions are
            signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cur-pw">Current password</Label>
              <div className="relative">
                <Input
                  id="cur-pw"
                  type={showCur ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCur((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label={showCur ? "Hide password" : "Show password"}
                >
                  {showCur ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-pw">New password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-pw">Confirm password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
              </div>
            </div>
            {errorMsg && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={change.isPending || !currentPw || newPw.length < 12}
              >
                {change.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>Not implemented yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4 opacity-60">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-medium">Authenticator app</div>
                <p className="text-xs text-muted-foreground">
                  Coming in a later release.
                </p>
              </div>
            </div>
            <Switch checked={false} onCheckedChange={() => {}} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ThemeOption({
  active,
  icon: Icon,
  label,
  preview,
  iconWrap,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  preview: string;
  iconWrap: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border-2 p-4 text-left transition-all hover:-translate-y-0.5",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/50"
      )}
    >
      <div
        className={cn(
          "flex h-24 items-center justify-center rounded-md border",
          preview
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            iconWrap
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}
