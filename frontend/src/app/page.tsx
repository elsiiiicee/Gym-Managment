"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    router.replace(getRole() === "ADMIN" ? "/admin" : "/me");
  }, [router]);
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
