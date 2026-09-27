import type { Metadata } from "next";
import { HistoryView } from "@/modules/history/history-view";

export const metadata: Metadata = { title: "Riwayat" };

export default function HistoryPage() {
  return <HistoryView />;
}
