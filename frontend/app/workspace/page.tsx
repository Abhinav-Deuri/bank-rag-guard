import type { Metadata } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import { Console } from "@/components/bank-rag/console/console";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Ask as a demo user and see what was searched, masked and withheld, then verify the tamper-evident audit log.",
};

export default function WorkspacePage() {
  return <Console />;
}
