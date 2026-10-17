import { ChartColumn, LayoutGrid, MessageSquareText, ScrollText, Users, type LucideIcon } from "lucide-react";

export type SectionId = "top" | "ask" | "insights" | "audit" | "users";

export interface DashboardSection {
  id: SectionId;
  /** Label for the tab and the rail tooltip. */
  label: string;
  icon: LucideIcon;
}

/** Section anchors shared by the top tabs and the icon rail. */
export const SECTIONS: DashboardSection[] = [
  { id: "top", label: "Overview", icon: LayoutGrid },
  { id: "users", label: "Identity", icon: Users },
  { id: "ask", label: "Assistant", icon: MessageSquareText },
  { id: "insights", label: "Insights", icon: ChartColumn },
  { id: "audit", label: "Audit", icon: ScrollText },
];

export const TAB_IDS: SectionId[] = ["top", "users", "ask", "insights", "audit"];
