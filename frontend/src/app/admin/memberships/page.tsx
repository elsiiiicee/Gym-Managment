"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, type AdminMembershipPlan } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

function billingLabel(months: number): { unit: string; suffix: string } {
  if (months === 1) return { unit: "/mo", suffix: "" };
  if (months === 12) return { unit: "/yr", suffix: "" };
  return { unit: `/${months}mo`, suffix: "" };
}

export default function MembershipsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "memberships"],
    queryFn: () =>
      api.get<AdminMembershipPlan[]>("/api/admin/membership-plans"),
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Memberships"
        description="The plans members can subscribe to. Each plan is priced for one billing period."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load plans: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No membership plans configured yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto w-full stagger">
          {(data ?? [])
            .filter((p) => p.active)
            .map((p) => (
              <PricingCard key={p.id} plan={p} />
            ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Prices in USD. Members are billed via wallet credit at the start of each
        period.
      </p>
    </div>
  );
}

function PricingCard({ plan }: { plan: AdminMembershipPlan }) {
  const price = (plan.priceCents / 100).toFixed(0);
  const { unit } = billingLabel(plan.billingPeriodMonths);
  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all hover:-translate-y-1 overflow-visible",
        plan.popular
          ? "conic-border shadow-xl shadow-primary/10"
          : "hover:shadow-md"
      )}
    >
      {plan.popular && (
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-md z-10">
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
            ${price}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          <Badge variant="outline" className="ml-auto">
            {plan.billingPeriodMonths === 1
              ? "Monthly"
              : plan.billingPeriodMonths === 12
                ? "Yearly"
                : `Every ${plan.billingPeriodMonths} months`}
          </Badge>
        </div>
        <Button
          variant={plan.popular ? "default" : "outline"}
          size="lg"
          className="w-full"
          onClick={() => toast.message("Subscribe flow not wired in admin view")}
        >
          Choose {plan.name}
        </Button>
        {plan.features.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <ul className="flex flex-col gap-2.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full shrink-0",
                      plan.popular
                        ? "bg-primary/15 text-primary"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span
                    style={{ textWrap: "pretty" } as React.CSSProperties}
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
}
