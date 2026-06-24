"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type AdminGymClass,
  type AdminTrainer,
  type ClassCreateRequest,
  type ClassUpdateRequest,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/admin/page-header";

function formatSchedule(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${startTime} – ${endTime}`;
}

// Convert ISO to the format <input type="datetime-local"> expects
// (`YYYY-MM-DDTHH:mm`, local time).
function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ClassesPage() {
  const classesQ = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: () => api.get<AdminGymClass[]>("/api/admin/classes"),
  });

  const [editing, setEditing] = React.useState<AdminGymClass | null>(null);
  const [creating, setCreating] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Classes"
        description="Every class on the schedule — enrollment, capacity, and trainers at a glance."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New class
          </Button>
        }
      />

      {classesQ.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load classes: {(classesQ.error as Error).message}
        </div>
      )}

      {classesQ.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (classesQ.data ?? []).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No classes scheduled yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {(classesQ.data ?? []).map((c) => (
            <ClassCard key={c.id} cls={c} onEdit={setEditing} />
          ))}
        </div>
      )}

      <ClassDialog
        open={creating}
        onClose={() => setCreating(false)}
        cls={null}
      />
      <ClassDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        cls={editing}
      />
    </div>
  );
}

function ClassCard({
  cls,
  onEdit,
}: {
  cls: AdminGymClass;
  onEdit: (c: AdminGymClass) => void;
}) {
  const queryClient = useQueryClient();
  const pct = Math.round((cls.enrolled / cls.capacity) * 100);

  const remove = useMutation({
    mutationFn: () => api.del<void>(`/api/admin/classes/${cls.id}`),
    onSuccess: () => {
      toast.success(`${cls.title} deactivated`);
      queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Could not deactivate class"
      ),
  });

  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {cls.category && <Badge variant="secondary">{cls.category}</Badge>}
            <span className="text-xs text-muted-foreground tabular-nums inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {cls.durationMin} min
            </span>
            <Badge
              variant={cls.priceCents > 0 ? "default" : "outline"}
              className="tabular-nums"
            >
              {cls.priceCents > 0
                ? `$${(cls.priceCents / 100).toFixed(0)} drop-in`
                : "Free"}
            </Badge>
            {!cls.active && (
              <Badge variant="outline" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(cls)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <h3 className="text-lg font-semibold tracking-tight">{cls.title}</h3>
        </div>

        <div className="flex items-center gap-3">
          <Avatar name={cls.trainerName} size="sm" />
          <div className="text-sm">
            <div className="font-medium">{cls.trainerName}</div>
            <div className="text-xs text-muted-foreground">
              {formatSchedule(cls.startsAt, cls.endsAt)}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              Enrollment
            </span>
            <span className="font-medium tabular-nums">
              {cls.enrolled}
              <span className="text-muted-foreground">/{cls.capacity}</span>
              <span className="ml-1 text-muted-foreground">({pct}%)</span>
            </span>
          </div>
          <Progress
            value={pct}
            colorClass={
              pct >= 90
                ? "bg-amber-500"
                : pct >= 70
                  ? "bg-primary"
                  : "bg-emerald-500"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ClassDialog({
  open,
  onClose,
  cls,
}: {
  open: boolean;
  onClose: () => void;
  cls: AdminGymClass | null;
}) {
  const queryClient = useQueryClient();
  const trainersQ = useQuery({
    queryKey: ["admin", "trainers"],
    queryFn: () => api.get<AdminTrainer[]>("/api/admin/trainers"),
    enabled: open,
  });

  const [trainerId, setTrainerId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [capacity, setCapacity] = React.useState(20);
  /** Drop-in price in DOLLARS for the input. Converted to cents on submit. */
  const [priceDollars, setPriceDollars] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    if (cls) {
      setTrainerId(cls.trainerId);
      setTitle(cls.title);
      setDescription(cls.description ?? "");
      setCategory(cls.category);
      setStartsAt(toLocalInputValue(cls.startsAt));
      setEndsAt(toLocalInputValue(cls.endsAt));
      setCapacity(cls.capacity);
      setPriceDollars((cls.priceCents ?? 0) / 100);
    } else {
      setTrainerId("");
      setTitle("");
      setDescription("");
      setCategory("");
      setStartsAt("");
      setEndsAt("");
      setCapacity(20);
      setPriceDollars(0);
    }
  }, [open, cls]);

  const create = useMutation({
    mutationFn: (req: ClassCreateRequest) =>
      api.post<AdminGymClass>("/api/admin/classes", req),
    onSuccess: () => {
      toast.success("Class created");
      queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
      onClose();
    },
    onError: (err) => setErrorMsg((err as Error).message),
  });

  const update = useMutation({
    mutationFn: (req: ClassUpdateRequest) =>
      api.put<AdminGymClass>(`/api/admin/classes/${cls!.id}`, req),
    onSuccess: () => {
      toast.success("Class updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
      onClose();
    },
    onError: (err) => setErrorMsg((err as Error).message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!trainerId) {
      setErrorMsg("Pick a trainer");
      return;
    }
    if (!startsAt || !endsAt) {
      setErrorMsg("Set a start and end time");
      return;
    }
    const startsIso = new Date(startsAt).toISOString();
    const endsIso = new Date(endsAt).toISOString();
    if (new Date(startsAt) >= new Date(endsAt)) {
      setErrorMsg("Start must be before end");
      return;
    }
    const priceCents = Math.round(Math.max(0, priceDollars) * 100);
    if (cls) {
      update.mutate({
        trainerId,
        title: title.trim(),
        description: description.trim() || title.trim(),
        startsAt: startsIso,
        endsAt: endsIso,
        capacity,
        category: category.trim(),
        priceCents,
        active: cls.active,
      });
    } else {
      // Backend's @Future on startsAt rejects past times.
      if (new Date(startsAt) <= new Date()) {
        setErrorMsg("Start time must be in the future");
        return;
      }
      create.mutate({
        trainerId,
        title: title.trim(),
        description: description.trim() || title.trim(),
        startsAt: startsIso,
        endsAt: endsIso,
        capacity,
        category: category.trim(),
        priceCents,
      });
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-xl p-0"
        srTitle={cls ? "Edit class" : "New class"}
        srDescription="Class details form"
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {cls ? "Edit class" : "New class"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {cls
                ? "Update class details and schedule."
                : "Create a new class on the schedule."}
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
            <Label htmlFor="cls-title">Class name</Label>
            <Input
              id="cls-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunrise HIIT"
              required
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="cls-desc">Description</Label>
            <Input
              id="cls-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What to expect"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-trainer">Trainer</Label>
            <select
              id="cls-trainer"
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="" disabled>
                {trainersQ.isLoading ? "Loading trainers…" : "Pick a trainer"}
              </option>
              {(trainersQ.data ?? [])
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-category">Category</Label>
            <Input
              id="cls-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="HIIT, Yoga, …"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-starts">Starts</Label>
            <Input
              id="cls-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-ends">Ends</Label>
            <Input
              id="cls-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-cap">Capacity</Label>
            <Input
              id="cls-cap"
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="cls-price">Drop-in price (USD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="cls-price"
                type="number"
                min={0}
                step={1}
                value={priceDollars}
                onChange={(e) => setPriceDollars(Number(e.target.value))}
                className="pl-7 tabular-nums"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              0 = free for everyone. Members on an active plan book free
              regardless; non-subscribers pay this amount from their wallet.
            </p>
          </div>
          {errorMsg && (
            <div className="col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMsg}
            </div>
          )}
          <div className="col-span-2 flex items-center justify-end gap-2 pt-4 pb-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {cls ? "Save changes" : "Create class"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
