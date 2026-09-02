"use client";

import { useEffect, useState } from "react";
import EditorShell from "@/components/editor/EditorShell";

export default function LocaleEditorPage({ params }: { params: { locale: string } }) {
  const locale = params.locale ?? "en";
  // EditorShell now accepts locale/messages via provider — for now pass locale
  // Messages are loaded inside EditorShell via dynamic import of messages/{locale}.json
  // Keep wrapper minimal for [locale] routing
  return <EditorShell initialLocale={locale} />;
}
