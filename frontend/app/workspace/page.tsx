import type { Metadata } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { Console } from "@/components/bank-rag/console/console";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Explore the AEGIS-Z sovereign AI security gateway console as a demo user, verify real-time guardrails, and audit tamper-evident logs.",
};

export default function WorkspacePage() {
  return <Console />;
}
