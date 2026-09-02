import { redirect } from "next/navigation";

// Keep for backward compatibility: any hit to / (without /editor) inside the editor Worker
// redirects to the canonical English editor. With basePath removed, this file maps to
// external "/" on the editor Worker's origin — but Wrangler only routes /editor* to this
// Worker, so this is a safety net for direct Worker access / local dev.
export default function Page() {
  redirect("/editor");
}
