"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import {
  ApiError,
  api,
  type CreditRequest,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface AddCreditMember {
  id: string;
  name: string;
  balance: number; // dollars
}

interface AddCreditDialogProps {
  open: boolean;
  onClose: () => void;
  member: AddCreditMember | null;
}

interface CreditTxnResult {
  transactionId: string;
  walletId: string;
  amountCents: number;
  balanceAfterCents: number;
}

export function AddCreditDialog({
  open,
  onClose,
  member,
}: AddCreditDialogProps) {
  const queryClient = useQueryClient();

  const [amount, setAmount] = React.useState(25);
  const [note, setNote] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  // Persistent across the dialog lifetime so retries collapse server-side.
  const idempotencyKey = React.useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random()}`
  );

  React.useEffect(() => {
    if (open) {
      setAmount(25);
      setNote("");
      setConfirmed(false);
      setErrorMsg(null);
      idempotencyKey.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `key-${Date.now()}-${Math.random()}`;
    }
  }, [open, member?.id]);

  const credit = useMutation({
    mutationFn: (req: { userId: string; body: CreditRequest }) =>
      api.post<CreditTxnResult>(
        `/api/admin/wallets/${req.userId}/credit`,
        req.body
      ),
    onSuccess: () => {
      // Invalidate everything that displays wallet state.
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "wallets", "recent"],
      });
      setConfirmed(true);
      setTimeout(() => onClose(), 1100);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not add credit";
      setErrorMsg(msg);
    },
  });

  if (!member) return null;

  function submit() {
    if (amount <= 0) {
      setErrorMsg("Amount must be greater than $0");
      return;
    }
    setErrorMsg(null);
    credit.mutate({
      userId: member!.id,
      body: {
        amountCents: Math.round(amount * 100),
        notes: note.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md p-0"
        srTitle={`Add credit to ${member.name}`}
        srDescription="Top up member wallet"
      >
        {!confirmed ? (
          <>
            <div className="flex items-start gap-4 p-6 pb-4">
              <Avatar name={member.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  Add credit
                </h2>
                <p className="text-sm text-muted-foreground">
                  Top up{" "}
                  <strong className="text-foreground">{member.name}</strong>
                  's wallet
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

            <div className="px-6 pb-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Current balance
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  ${member.balance.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="px-6 pb-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amt">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="amt"
                    type="number"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="pl-7 text-base font-semibold tabular-nums"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[10, 25, 50, 100, 250].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors",
                        amount === v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-accent"
                      )}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Birthday bonus, referral reward…"
                  maxLength={500}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  New balance after top-up
                </div>
                <div className="text-lg font-semibold tabular-nums text-primary">
                  ${(member.balance + amount).toFixed(2)}
                </div>
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
              <Button
                onClick={submit}
                disabled={credit.isPending || amount <= 0}
              >
                {credit.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add ${amount.toFixed(2)} credit
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
                Credit added
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                ${amount.toFixed(2)} added to {member.name}'s wallet
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
