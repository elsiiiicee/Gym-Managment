"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Loader2,
  Mail,
  Pencil,
  Save,
  Star,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type AdminTrainer,
  type TrainerUpdateRequest,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

export default function TrainersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "trainers"],
    queryFn: () => api.get<AdminTrainer[]>("/api/admin/trainers"),
  });

  const [selected, setSelected] = React.useState<AdminTrainer | null>(null);
  const [editing, setEditing] = React.useState<AdminTrainer | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trainers"
        description="The coaches who run the floor — ratings, specializations, and weekly load."
        actions={
          <Button onClick={() => toast.message("Invite trainer not wired yet")}>
            <UserPlus className="h-4 w-4" />
            Invite trainer
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load trainers: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No trainers yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
          {(data ?? []).map((t) => (
            <TrainerCard key={t.id} t={t} onOpen={setSelected} />
          ))}
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      >
        <DialogContent
          className="max-w-xl p-0 overflow-hidden"
          srTitle={selected ? `Trainer · ${selected.name}` : "Trainer details"}
          srDescription="Trainer profile and contact info"
        >
          {selected && (
            <>
              <div className="relative h-28 bg-gradient-to-br from-orange-500 via-amber-500 to-pink-500">
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 rounded-md bg-black/20 p-1.5 text-white hover:bg-black/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 pb-6">
                <div className="-mt-12 mb-3 flex items-end gap-4">
                  <Avatar
                    name={selected.name}
                    size="xl"
                    className="ring-4 ring-card"
                  />
                  <div className="pb-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {selected.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selected.specialty}
                    </p>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed text-muted-foreground"
                  style={{ textWrap: "pretty" } as React.CSSProperties}
                >
                  {selected.bio}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Field
                    label="Rating"
                    value={
                      selected.rating != null
                        ? `${Number(selected.rating).toFixed(1)} / 5.0`
                        : "Not rated"
                    }
                  />
                  <Field
                    label="Classes / week"
                    value={String(selected.classesPerWeek)}
                  />
                  <Field
                    label="Email"
                    value={selected.email ?? "—"}
                  />
                  <Field
                    label="Fee per class"
                    value={
                      selected.feePerClassCents > 0
                        ? `$${(selected.feePerClassCents / 100).toFixed(2)}`
                        : "Not set"
                    }
                  />
                  <div className="col-span-2 rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Availability
                    </div>
                    <div className="mt-1">
                      <StatusBadge
                        status={selected.active ? "ACTIVE" : "INACTIVE"}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(selected);
                      setSelected(null);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    disabled={!selected.email}
                    onClick={() => {
                      if (selected.email)
                        window.location.href = `mailto:${selected.email}`;
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Message {selected.name.split(" ")[0]}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <EditTrainerDialog
        trainer={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function EditTrainerDialog({
  trainer,
  onClose,
}: {
  trainer: AdminTrainer | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [specialty, setSpecialty] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [rating, setRating] = React.useState<string>("");
  const [feeDollars, setFeeDollars] = React.useState(0);
  const [active, setActive] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (trainer) {
      setName(trainer.name);
      setSpecialty(trainer.specialty);
      setBio(trainer.bio ?? "");
      setRating(
        trainer.rating != null ? Number(trainer.rating).toFixed(1) : ""
      );
      setFeeDollars((trainer.feePerClassCents ?? 0) / 100);
      setActive(trainer.active);
      setErrorMsg(null);
    }
  }, [trainer]);

  const save = useMutation({
    mutationFn: (req: TrainerUpdateRequest) =>
      api.put<AdminTrainer>(`/api/admin/trainers/${trainer!.id}`, req),
    onSuccess: () => {
      toast.success("Trainer updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "trainers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payroll"] });
      onClose();
    },
    onError: (err) =>
      setErrorMsg(err instanceof Error ? err.message : "Could not save"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const ratingNum = rating.trim() === "" ? null : Number(rating);
    if (ratingNum != null && (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5)) {
      setErrorMsg("Rating must be between 0.0 and 5.0");
      return;
    }
    save.mutate({
      name: name.trim(),
      specialty: specialty.trim(),
      bio: bio.trim() || specialty.trim(),
      active,
      rating: ratingNum,
      feePerClassCents: Math.round(Math.max(0, feeDollars) * 100),
    });
  }

  return (
    <Dialog open={!!trainer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-xl p-0"
        srTitle="Edit trainer"
        srDescription="Update trainer profile and per-class fee"
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Edit trainer
            </h2>
            <p className="text-sm text-muted-foreground">
              Profile + per-class fee for payroll.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4 px-6 pb-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="t-name">Name</Label>
            <Input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="t-specialty">Specialty</Label>
            <Input
              id="t-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="t-bio">Bio</Label>
            <Input
              id="t-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short summary shown to members"
              maxLength={1000}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-rating">Rating (0.0 – 5.0)</Label>
            <Input
              id="t-rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="e.g. 4.8"
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-fee">Fee per class (USD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="t-fee"
                type="number"
                min={0}
                step={1}
                value={feeDollars}
                onChange={(e) => setFeeDollars(Number(e.target.value))}
                className="pl-7 tabular-nums"
              />
            </div>
          </div>
          <div className="col-span-2 flex items-start justify-between gap-4 rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Active</div>
              <p className="text-xs text-muted-foreground">
                Inactive trainers can&apos;t be assigned to new classes.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          {errorMsg && (
            <div className="col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMsg}
            </div>
          )}
          <div className="col-span-2 flex items-center justify-end gap-2 pt-2 pb-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrainerCard({
  t,
  onOpen,
}: {
  t: AdminTrainer;
  onOpen: (t: AdminTrainer) => void;
}) {
  return (
    <Card
      className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={() => onOpen(t)}
    >
      <div className="relative h-24 bg-gradient-to-br from-orange-500 via-amber-500 to-pink-500">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%),radial-gradient(circle_at_80%_70%,white,transparent_50%)]" />
        <span
          className={cn(
            "absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm",
            t.active
              ? "bg-emerald-500/90 text-white"
              : "bg-rose-500/90 text-white"
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {t.active ? "Available" : "Off duty"}
        </span>
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <Avatar
            name={t.name}
            size="xl"
            className="ring-4 ring-card"
          />
        </div>
        <h3 className="text-base font-semibold tracking-tight">{t.name}</h3>
        <p className="text-sm text-muted-foreground">{t.specialty}</p>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Star
              className="h-3.5 w-3.5 text-amber-500"
              fill={t.rating != null ? "currentColor" : "none"}
            />
            <span className="font-semibold tabular-nums">
              {t.rating != null ? Number(t.rating).toFixed(1) : "—"}
            </span>
          </span>
          <span className="text-muted-foreground tabular-nums inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className="font-medium text-foreground">
              {t.classesPerWeek}
            </span>{" "}
            classes/wk
          </span>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}
