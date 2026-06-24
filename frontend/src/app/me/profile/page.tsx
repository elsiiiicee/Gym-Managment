"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, type MyProfile } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB — matches backend limit.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function MyProfilePage() {
  const queryClient = useQueryClient();
  const meQ = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api.get<MyProfile>("/api/users/me"),
  });

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
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
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
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
    // Reset input so picking the same file again still triggers onChange.
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }
    uploadAvatar.mutate(file);
  }

  const me = meQ.data;
  const dirty =
    !!me &&
    (name.trim() !== me.fullName || phone.trim() !== (me.phone ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your photo, name, and contact info.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative">
              {meQ.isLoading ? (
                <Skeleton className="h-20 w-20 rounded-full" />
              ) : (
                <Avatar
                  name={me?.fullName || me?.email || "Member"}
                  size="xl"
                  src={me?.avatarUrl ?? undefined}
                />
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending || meQ.isLoading}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                aria-label="Change photo"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onFilePicked}
              />
            </div>
            <div className="text-center sm:text-left">
              <div className="text-lg font-semibold tracking-tight">
                {me?.fullName ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                {me?.email ?? ""}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                JPG, PNG, or WebP. Up to 2&nbsp;MB.
              </p>
            </div>
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
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
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
              <Input
                id="email"
                type="email"
                value={me?.email ?? ""}
                disabled
                readOnly
              />
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
                disabled={!dirty || save.isPending}
                onClick={() => {
                  if (me) {
                    setName(me.fullName);
                    setPhone(me.phone ?? "");
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!dirty || save.isPending || meQ.isLoading}
              >
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
    </div>
  );
}
