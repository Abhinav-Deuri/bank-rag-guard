import type { Metadata } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { Console } from "@/components/bank-rag/console/console";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Ask the Bank RAG Guard demo assistant as a demo user, see what it read and what it removed, and check the audit log.",
};

export default function WorkspacePage() {
  return <Console />;
}
