import type { Metadata } from "next";
import { SettingsView } from "@/modules/settings/settings-view";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return <SettingsView />;
}
