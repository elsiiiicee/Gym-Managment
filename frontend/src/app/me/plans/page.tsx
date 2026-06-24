"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  api,
  type MembershipPlan,
  type MySubscription,
  type MyWallet,
  type PurchaseSubscriptionRequest,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function periodLabel(months: number): string {
  if (months === 1) return "/mo";
  if (months === 12) return "/yr";
  return `/${months}mo`;
}

export default function MyPlansPage() {
  const queryClient = useQueryClient();
  const plansQ = useQuery({
    queryKey: ["me", "plans"],
    queryFn: () => api.get<MembershipPlan[]>("/api/membership-plans"),
  });
  const walletQ = useQuery({
    queryKey: ["me", "wallet"],
    queryFn: () => api.get<MyWallet>("/api/wallet"),
  });
  const subsQ = useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => api.get<MySubscription[]>("/api/subscriptions"),
  });

  const activeSub = (subsQ.data ?? []).find((s) => s.status === "ACTIVE");
  const balanceCents = walletQ.data?.balanceCents ?? 0;

  const subscribe = useMutation({
    mutationFn: (req: PurchaseSubscriptionRequest) =>
      api.post<MySubscription>("/api/subscriptions", req),
    onSuccess: (sub) => {
      toast.success(`You're now on ${sub.planName}`);
      queryClient.invalidateQueries({ queryKey: ["me", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["me", "wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me", "wallet", "txns"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not subscribe";
      toast.error(msg);
    },
  });

  function handleSubscribe(plan: MembershipPlan) {
    if (plan.priceCents > balanceCents) {
      toast.error(
        "Not enough credit. Ask your gym to top up your wallet first."
      );
      return;
    }
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random()}`;
    subscribe.mutate({ planId: plan.id, idempotencyKey });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Membership plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe with your wallet credit. Plans are billed automatically each
          period.
        </p>
      </div>

      {/* Wallet hint */}
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Wallet className="h-3.5 w-3.5" />
        Your credit:{" "}
        <span className="font-semibold tabular-nums">
          ${(balanceCents / 100).toFixed(2)}
        </span>
      </div>

      {plansQ.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t load plans: {(plansQ.error as Error).message}
        </div>
      )}

      {plansQ.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : (plansQ.data ?? []).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No plans available yet. Check back later.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(plansQ.data ?? []).map((plan) => {
            const isCurrent = activeSub?.planId === plan.id;
            const canAfford = balanceCents >= plan.priceCents;
            const submitting =
              subscribe.isPending && subscribe.variables?.planId === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col overflow-visible transition hover:-translate-y-0.5 hover:shadow-md",
                  plan.popular &&
                    "border-primary/50 shadow-md shadow-primary/10"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 right-5 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow">
                    <Sparkles className="h-3 w-3" />
                    Most popular
                  </span>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription
                    style={{ textWrap: "pretty" } as React.CSSProperties}
                  >
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5 pb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight tabular-nums">
                      ${(plan.priceCents / 100).toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {periodLabel(plan.billingPeriodMonths)}
                    </span>
                  </div>
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    className="w-full"
                    disabled={
                      isCurrent || submitting || subscribe.isPending
                    }
                    onClick={() => handleSubscribe(plan)}
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {isCurrent
                      ? "Your current plan"
                      : !canAfford
                        ? `Need $${((plan.priceCents - balanceCents) / 100).toFixed(2)} more`
                        : `Subscribe · $${(plan.priceCents / 100).toFixed(0)}`}
                  </Button>
                  {plan.features.length > 0 && (
                    <>
                      <div className="h-px bg-border" />
                      <ul className="flex flex-col gap-2.5">
                        {plan.features.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                                plan.popular
                                  ? "bg-primary/15 text-primary"
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            <span
                              style={
                                { textWrap: "pretty" } as React.CSSProperties
                              }
                            >
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
