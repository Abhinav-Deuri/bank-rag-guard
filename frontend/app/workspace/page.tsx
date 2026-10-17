import type { Metadata } from "next";
import { Workspace } from "@/components/bank-rag/workspace";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Ask the Bank RAG Guard demo assistant as a demo user and inspect what the server applied.",
};

export default function WorkspacePage() {
  return <Workspace />;
}
