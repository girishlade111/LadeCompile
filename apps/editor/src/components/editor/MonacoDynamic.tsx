"use client";

import dynamic from "next/dynamic";

const MonacoTest = dynamic(() => import("./MonacoTest"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground">
      Loading Monaco...
    </div>
  ),
});

export default MonacoTest;
