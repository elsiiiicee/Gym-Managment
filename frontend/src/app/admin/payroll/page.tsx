"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Receipt,
  Wallet,
  X,
} from "lucide-react";
import {
  ApiError,
  api,
  type PayoutRequest,
  type PayoutResult,
  type PayrollRow,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PayrollPage() {
  const payrollQ = useQuery({
    queryKey: ["admin", "payroll"],
    queryFn: () => api.get<PayrollRow[]>("/api/admin/payroll"),
  });

  const [payoutTarget, setPayoutTarget] = React.useState<PayrollRow | null>(
    null
  );

  const rows = payrollQ.data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      earned: acc.earned + r.earnedCents,
      paid: acc.paid + r.paidCents,
      outstanding: acc.outstanding + r.outstandingCents,
    }),
    { earned: 0, paid: 0, outstanding: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        description="What each trainer has earned (fee × classes taught) and what you've paid out."
      />

      {payrollQ.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t load payroll: {(payrollQ.error as Error).message}
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Earned"
          value={dollars(totals.earned)}
          icon={<Receipt className="h-[18px] w-[18px]" />}
          tint="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          loading={payrollQ.isLoading}
        />
        <SummaryStat
          label="Paid out"
          value={dollars(totals.paid)}
          icon={<Wallet className="h-[18px] w-[18px]" />}
          tint="bg-orange-500/15 text-orange-600 dark:text-orange-400"
          loading={payrollQ.isLoading}
        />
        <SummaryStat
          label="Outstanding"
          value={dollars(totals.outstanding)}
          icon={<Receipt className="h-[18px] w-[18px]" />}
          tint={
            totals.outstanding > 0
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }
          loading={payrollQ.isLoading}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Trainers</CardTitle>
          <CardDescription>
            Outstanding = earned − paid. Click &ldquo;Pay&rdquo; to record a
            payout against the outstanding amount.
          </CardDescription>
        </CardHeader>
        {payrollQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title="No trainers yet"
              description="Add trainers and set their per-class fee to see payroll here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="font-medium py-2.5 px-5">Trainer</th>
                  <th className="font-medium py-2.5 px-5 text-right">
                    Fee / class
                  </th>
                  <th className="font-medium py-2.5 px-5 text-right">
                    Taught
                  </th>
                  <th className="font-medium py-2.5 px-5 text-right">
                    Earned
                  </th>
                  <th className="font-medium py-2.5 px-5 text-right">
                    Paid
                  </th>
                  <th className="font-medium py-2.5 px-5 text-right">
                    Outstanding
                  </th>
                  <th className="font-medium py-2.5 px-5 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const owes = r.outstandingCents > 0;
                  const overpaid = r.outstandingCents < 0;
                  return (
                    <tr
                      key={r.trainerId}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} size="sm" />
                          <div className="min-w-0">
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {r.specialty}
                            </div>
                          </div>
                          {!r.active && (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums">
                        {r.feePerClassCents > 0
                          ? dollars(r.feePerClassCents)
                          : "—"}
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums">
                        {r.classesTaught}
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums">
                        {dollars(r.earnedCents)}
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums">
                        {dollars(r.paidCents)}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-5 text-right tabular-nums font-semibold",
                          owes && "text-amber-600 dark:text-amber-400",
                          overpaid && "text-rose-600 dark:text-rose-400",
                          !owes && !overpaid && "text-muted-foreground"
                        )}
                      >
                        {dollars(r.outstandingCents)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!owes}
                          onClick={() => setPayoutTarget(r)}
                        >
                          <Wallet className="h-3 w-3" />
                          Pay
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PayoutDialog
        target={payoutTarget}
        onClose={() => setPayoutTarget(null)}
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
  tint,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-md",
            tint
          )}
        >
          {icon}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutDialog({
  target,
  onClose,
}: {
  target: PayrollRow | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amountDollars, setAmountDollars] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const idempotencyKey = React.useRef<string>("");

  React.useEffect(() => {
    if (target) {
      setAmountDollars(target.outstandingCents / 100);
      setNotes("");
      setConfirmed(false);
      setErrorMsg(null);
      idempotencyKey.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `payout-${Date.now()}-${Math.random()}`;
    }
  }, [target]);

  const payout = useMutation({
    mutationFn: (req: { trainerId: string; body: PayoutRequest }) =>
      api.post<PayoutResult>(
        `/api/admin/payroll/${req.trainerId}/payout`,
        req.body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payroll"] });
      setConfirmed(true);
      setTimeout(onClose, 900);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not record payout";
      setErrorMsg(msg);
    },
  });

  function submit() {
    setErrorMsg(null);
    if (amountDollars <= 0) {
      setErrorMsg("Amount must be greater than $0");
      return;
    }
    payout.mutate({
      trainerId: target!.trainerId,
      body: {
        amountCents: Math.round(amountDollars * 100),
        notes: notes.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
      },
    });
  }

  if (!target) return null;

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md p-0"
        srTitle={`Pay ${target.name}`}
        srDescription="Record a payout against outstanding earnings"
      >
        {!confirmed ? (
          <>
            <div className="flex items-start gap-4 p-6 pb-4">
              <Avatar name={target.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  Pay {target.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Outstanding: {dollars(target.outstandingCents)}
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

            <div className="px-6 pb-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="po-amt">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="po-amt"
                    type="number"
                    min={1}
                    step={1}
                    value={amountDollars}
                    onChange={(e) => setAmountDollars(Number(e.target.value))}
                    className="pl-7 text-base font-semibold tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Defaults to full outstanding. Adjust to make a partial
                  payout.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="po-notes">Note (optional)</Label>
                <Input
                  id="po-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sep payroll · cash"
                  maxLength={500}
                />
              </div>

              {errorMsg && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-6 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={payout.isPending}>
                {payout.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wallet className="h-3.5 w-3.5" />
                )}
                Record ${amountDollars.toFixed(2)} payout
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 p-10 text-center animate-zoom-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Payout recorded
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                ${amountDollars.toFixed(2)} marked paid to {target.name}.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
