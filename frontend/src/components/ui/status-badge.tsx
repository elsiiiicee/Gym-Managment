import { Badge } from "./badge";
import { cn } from "@/lib/utils";

type Status = "CONFIRMED" | "PENDING" | "CANCELLED" | "ACTIVE" | "INACTIVE";

const map: Record<
  Status,
  { v: "success" | "warning" | "destructive" | "secondary"; dot: string; label: string }
> = {
  CONFIRMED: { v: "success", dot: "bg-emerald-500", label: "Confirmed" },
  PENDING: { v: "warning", dot: "bg-amber-500", label: "Pending" },
  CANCELLED: { v: "destructive", dot: "bg-rose-500", label: "Cancelled" },
  ACTIVE: { v: "success", dot: "bg-emerald-500", label: "Active" },
  INACTIVE: { v: "destructive", dot: "bg-rose-500", label: "Inactive" },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = map[status];
  return (
    <Badge variant={cfg.v}>
      <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}
