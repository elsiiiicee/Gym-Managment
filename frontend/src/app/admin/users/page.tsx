"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shield,
  UserPlus,
  UserX,
  Wallet,
  X,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ApiError,
  api,
  type CreateMemberRequest,
  type MemberRow,
  type UserRole,
  type WalletSummary,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/admin/page-header";
import {
  AddCreditDialog,
  type AddCreditMember,
} from "@/components/admin/add-credit-dialog";
import { cn } from "@/lib/utils";

type RoleFilter = "ALL" | "ADMIN" | "USER" | "TRAINER";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "ADMIN")
    return (
      <Badge variant="default">
        <Shield className="mr-1 h-3 w-3" /> Admin
      </Badge>
    );

  if (role === "TRAINER")
    return (
      <Badge variant="secondary">
        <Shield className="mr-1 h-3 w-3" /> Trainer
      </Badge>
    );

  return (
    <Badge variant="outline">
      <Shield className="mr-1 h-3 w-3" /> Member
    </Badge>
  );
}

export default function MembersPage() {
  const membersQ = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => api.get<MemberRow[]>("/api/admin/users"),
  });

  const walletsQ = useQuery({
    queryKey: ["admin", "wallets"],
    queryFn: () => api.get<WalletSummary[]>("/api/admin/wallets"),
  });

  const balanceByUserId = React.useMemo(() => {
    const map = new Map<string, number>();
    (walletsQ.data ?? []).forEach((w) => map.set(w.userId, w.balanceCents));
    return map;
  }, [walletsQ.data]);

  const queryClient = useQueryClient();

  const deleteMember = useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/admin/users/${id}`),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not remove member";
      toast.error(message);
    },
  });

  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [selected, setSelected] = React.useState<MemberRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [topUpTarget, setTopUpTarget] = React.useState<AddCreditMember | null>(
    null
  );

  const [resetTarget, setResetTarget] = React.useState<MemberRow | null>(null);

  const filtered = React.useMemo(() => {
    const items = membersQ.data ?? [];
    return items.filter((m) => {
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;

      if (statusFilter !== "ALL") {
        const active = statusFilter === "ACTIVE";
        if (m.active !== active) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        if (
          !m.fullName.toLowerCase().includes(q) &&
          !m.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [membersQ.data, query, roleFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description="Everyone with an account at Legion — admins, trainers, and members. Accounts are created here."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
        }
      />

      {membersQ.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load members: {(membersQ.error as Error).message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                Role:&nbsp;
                <span className="font-semibold">
                  {roleFilter === "ALL"
                    ? "Any"
                    : roleFilter.charAt(0) + roleFilter.slice(1).toLowerCase()}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setRoleFilter("ALL")}>
                Any role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setRoleFilter("ADMIN")}>
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRoleFilter("TRAINER")}>
                Trainer
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRoleFilter("USER")}>
                Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                Status:&nbsp;
                <span className="font-semibold">
                  {statusFilter === "ALL"
                    ? "Any"
                    : statusFilter.charAt(0) +
                      statusFilter.slice(1).toLowerCase()}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setStatusFilter("ALL")}>
                Any status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setStatusFilter("ACTIVE")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setStatusFilter("INACTIVE")}>
                Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden">
        {membersQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={UserX}
              title="No members match your filters"
              description="Try a different search or clear filters to see everyone."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="font-medium py-3 px-5">Member</th>
                  <th className="font-medium py-3 px-5">Email</th>
                  <th className="font-medium py-3 px-5">Role</th>
                  <th className="font-medium py-3 px-5">Status</th>
                  <th className="font-medium py-3 px-5 text-right">Credit</th>
                  <th className="font-medium py-3 px-5">Joined</th>
                  <th className="font-medium py-3 px-5 w-12"></th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((m) => {
                  const cents = balanceByUserId.get(m.id);
                  const empty = cents == null || cents === 0;

                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.fullName} />
                          <div>
                            <div className="font-medium">{m.fullName}</div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {m.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-5 text-muted-foreground">
                        {m.email}
                      </td>

                      <td className="py-3 px-5">
                        <RoleBadge role={m.role} />
                      </td>

                      <td className="py-3 px-5">
                        <StatusBadge
                          status={m.active ? "ACTIVE" : "INACTIVE"}
                        />
                      </td>

                      <td className="py-3 px-5 text-right tabular-nums">
                        {walletsQ.isLoading ? (
                          <Skeleton className="ml-auto h-4 w-12" />
                        ) : cents == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={cn(
                              "font-medium",
                              empty && "text-muted-foreground"
                            )}
                          >
                            ${(cents / 100).toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-5 text-muted-foreground tabular-nums">
                        {new Date(m.joined).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setSelected(m)}>
                              <Eye className="h-4 w-4" /> View details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onSelect={() =>
                                setTopUpTarget({
                                  id: m.id,
                                  name: m.fullName,
                                  balance: (cents ?? 0) / 100,
                                })
                              }
                            >
                              <Plus className="h-4 w-4" /> Add credit
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onSelect={() => setResetTarget(m)}
                            >
                              <KeyRound className="h-4 w-4" /> Reset password
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {m.role === "USER" && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => {
                                  if (
                                    confirm(
                                      `Delete ${m.fullName}? This cannot be undone.`
                                    )
                                  ) {
                                    deleteMember.mutate(m.id);
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4" /> Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            Showing {filtered.length} of {membersQ.data?.length ?? 0}
          </span>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button variant="outline" size="sm" disabled>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent
          className="p-0"
          srTitle={selected ? `Member · ${selected.fullName}` : "Member details"}
          srDescription="Member profile, status, and credit"
        >
          {selected && (
            <>
              <div className="flex items-start gap-4 p-6">
                <Avatar name={selected.fullName} size="xl" />

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {selected.fullName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.email}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <RoleBadge role={selected.role} />
                    <StatusBadge
                      status={selected.active ? "ACTIVE" : "INACTIVE"}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded-md p-1.5 hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 px-6 pb-2">
                <Field
                  label="Role"
                  value={
                    selected.role.charAt(0) +
                    selected.role.slice(1).toLowerCase()
                  }
                />
                <Field
                  label="Status"
                  value={selected.active ? "Active" : "Inactive"}
                />
                <Field label="Member ID" value={selected.id} mono />
                <Field
                  label="Joined"
                  value={new Date(selected.joined).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
              </div>

              <div className="px-6 pb-2">
                <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="h-4 w-4" />
                    </span>

                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Wallet credit
                      </div>
                      <div className="text-xl font-semibold tabular-nums">
                        $
                        {(
                          (balanceByUserId.get(selected.id) ?? 0) / 100
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTopUpTarget({
                        id: selected.id,
                        name: selected.fullName,
                        balance:
                          (balanceByUserId.get(selected.id) ?? 0) / 100,
                      });
                      setSelected(null);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add credit
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-6 pt-4">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CreateMemberDialog open={creating} onClose={() => setCreating(false)} />

      <AddCreditDialog
        open={!!topUpTarget}
        onClose={() => setTopUpTarget(null)}
        member={topUpTarget}
      />

      <ResetPasswordDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        member={resetTarget}
      />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate text-sm font-medium",
          mono && "font-mono"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: MemberRow | null;
}) {
  const [password, setPassword] = React.useState("");
  const [reason, setReason] = React.useState("Admin reset requested by user.");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setPassword("");
      setReason("Admin reset requested by user.");
      setErrorMsg(null);
    }
  }, [open]);

  const resetPassword = useMutation({
    mutationFn: () =>
      api.post(`/api/admin/users/${member?.id}/password-reset`, {
        temporaryPassword: password,
        reason,
      }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      onClose();
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not reset password";
      setErrorMsg(msg);
    },
  });

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md p-0"
        srTitle="Reset member password"
        srDescription="Admin changes a user's temporary password"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-[18px] w-[18px]" />
            </span>

            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Reset password
              </h2>
              <p className="text-sm text-muted-foreground">
                Set a temporary password for {member.fullName}.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password">Temporary password</Label>
              <Input
                id="reset-password"
                type="password"
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                autoComplete="new-password"
              />

              {password.length > 0 && password.length < 12 && (
                <p className="text-xs text-destructive">
                  Password must be at least 12 characters.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-reason">Reason</Label>
              <Input
                id="reset-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              disabled={
                password.length < 12 ||
                !reason.trim() ||
                resetPassword.isPending
              }
              onClick={() => resetPassword.mutate()}
            >
              {resetPassword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Reset password
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateMemberDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("USER");
  const [credit, setCredit] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      setCredit(0);
      setDone(false);
      setErrorMsg(null);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: (req: CreateMemberRequest) =>
      api.post<MemberRow>("/api/admin/users", req),
    onSuccess: (created) => {
      toast.success(`Created ${created.fullName}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      setDone(true);
      setTimeout(onClose, 1100);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create member";
      setErrorMsg(msg);
    },
  });

  function submit() {
    setErrorMsg(null);
    create.mutate({
      email: email.trim(),
      password,
      fullName: name.trim(),
      role,
      active: true,
      welcomeCreditCents: credit > 0 ? Math.round(credit * 100) : undefined,
    });
  }

  const passwordTooShort = password.length > 0 && password.length < 12;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg p-0"
        srTitle="Create member account"
        srDescription="Set up a new gym member's login and welcome credit"
      >
        {!done ? (
          <>
            <div className="flex items-start justify-between p-6 pb-2">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-[18px] w-[18px]" />
                </span>

                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Create member account
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sets an initial password. Share it with the member; they can
                    change it from their profile.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pb-2 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="cm-name">Full name</Label>
                <Input
                  id="cm-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Avery Lin"
                  required
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="cm-email">Email</Label>
                <Input
                  id="cm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="avery@example.com"
                  required
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="cm-password">Initial password</Label>
                <Input
                  id="cm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  required
                  minLength={12}
                  autoComplete="new-password"
                />

                {passwordTooShort && (
                  <p className="text-xs text-destructive">
                    Password must be at least 12 characters.
                  </p>
                )}
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Role</Label>
                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                  {(
                    [
                      { v: "USER", l: "Member" },
                      { v: "TRAINER", l: "Trainer" },
                      { v: "ADMIN", l: "Admin" },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      onClick={() => setRole(r.v)}
                      className={cn(
                        "flex-1 rounded px-2 py-1 text-xs font-medium transition-all",
                        role === r.v
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="cm-credit">Welcome credit optional</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>

                  <Input
                    id="cm-credit"
                    type="number"
                    min={0}
                    step={5}
                    value={credit}
                    onChange={(e) => setCredit(Number(e.target.value))}
                    className="pl-7 tabular-nums"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 pt-4">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Admin-only action
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>

                <Button
                  onClick={submit}
                  disabled={
                    !name || !email || password.length < 12 || create.isPending
                  }
                >
                  {create.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Create account
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 p-10 text-center animate-zoom-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Account created
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {name} can now sign in with their initial password.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}