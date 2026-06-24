"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  Clock,
  Loader2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  api,
  type BookRequest,
  type MemberBooking,
  type MemberClass,
  type MySubscription,
  type MyWallet,
} from "@/lib/api";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatClassTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function durationMin(startsAt: string, endsAt: string): number {
  return Math.round(
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000
  );
}

export default function MyClassesPage() {
  const queryClient = useQueryClient();
  const classesQ = useQuery({
    queryKey: ["me", "classes"],
    queryFn: () => api.get<MemberClass[]>("/api/classes"),
  });
  const bookingsQ = useQuery({
    queryKey: ["me", "bookings"],
    queryFn: () => api.get<MemberBooking[]>("/api/bookings"),
  });
  const subsQ = useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => api.get<MySubscription[]>("/api/subscriptions"),
  });
  const walletQ = useQuery({
    queryKey: ["me", "wallet"],
    queryFn: () => api.get<MyWallet>("/api/wallet"),
  });

  const now = Date.now();
  const hasActiveSub = (subsQ.data ?? []).some(
    (s) => s.status === "ACTIVE" && new Date(s.endsAt).getTime() > now
  );
  const balanceCents = walletQ.data?.balanceCents ?? 0;

  const myBookings = bookingsQ.data ?? [];
  const bookingByClassId = React.useMemo(() => {
    const m = new Map<string, MemberBooking>();
    for (const b of myBookings) {
      if (b.status === "BOOKED") m.set(b.classId, b);
    }
    return m;
  }, [myBookings]);

  const book = useMutation({
    mutationFn: (req: BookRequest) =>
      api.post<MemberBooking>("/api/bookings", req),
    onSuccess: (b) => {
      toast.success(`Booked ${b.title}`);
      queryClient.invalidateQueries({ queryKey: ["me", "bookings"] });
      // Booking may have debited the wallet; refresh balance and tx feed.
      queryClient.invalidateQueries({ queryKey: ["me", "wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me", "wallet", "txns"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not book class";
      toast.error(msg);
    },
  });

  const cancel = useMutation({
    mutationFn: (bookingId: string) =>
      api.del<void>(`/api/bookings/${bookingId}`),
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["me", "bookings"] });
      // Refund may have credited the wallet.
      queryClient.invalidateQueries({ queryKey: ["me", "wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me", "wallet", "txns"] });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Could not cancel booking"
      ),
  });

  const classes = classesQ.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Classes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The next sessions on the schedule. Book the ones you want to attend.
        </p>
      </div>

      {classesQ.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t load classes: {(classesQ.error as Error).message}
        </div>
      )}

      {classesQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No upcoming classes right now. Check back soon.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const myBooking = bookingByClassId.get(c.id);
            const booked = !!myBooking;
            const submitting =
              book.isPending && book.variables?.classId === c.id;
            const cancelling =
              cancel.isPending && cancel.variables === myBooking?.id;
            return (
              <Card
                key={c.id}
                className="group transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {durationMin(c.startsAt, c.endsAt)} min
                    </span>
                    {(() => {
                      const free = c.priceCents === 0 || hasActiveSub;
                      const label =
                        c.priceCents === 0
                          ? "Free"
                          : hasActiveSub
                            ? "Free · plan"
                            : `$${(c.priceCents / 100).toFixed(0)}`;
                      return (
                        <Badge
                          variant={free ? "success" : "default"}
                          className="tabular-nums"
                        >
                          {label}
                        </Badge>
                      );
                    })()}
                    {booked && <Badge variant="success">Booked</Badge>}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {c.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar name={c.trainerName} size="sm" />
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {c.trainerName}
                        </div>
                        <div>{formatClassTime(c.startsAt)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" />
                      Capacity {c.capacity}
                    </span>
                  </div>
                  {(() => {
                    const willCharge = !hasActiveSub && c.priceCents > 0;
                    const cannotAfford = willCharge && balanceCents < c.priceCents;
                    if (booked) {
                      return (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={cancelling}
                          onClick={() =>
                            myBooking && cancel.mutate(myBooking.id)
                          }
                        >
                          {cancelling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Cancel booking
                        </Button>
                      );
                    }
                    return (
                      <Button
                        type="button"
                        size="sm"
                        disabled={submitting || cannotAfford}
                        onClick={() => book.mutate({ classId: c.id })}
                      >
                        {submitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CalendarCheck2 className="h-3.5 w-3.5" />
                        )}
                        {cannotAfford
                          ? `Need $${((c.priceCents - balanceCents) / 100).toFixed(2)} more`
                          : willCharge
                            ? `Book · $${(c.priceCents / 100).toFixed(0)}`
                            : "Book this class"}
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
