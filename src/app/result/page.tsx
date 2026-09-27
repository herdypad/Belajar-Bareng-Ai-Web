import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/ui";
import { ResultView } from "@/modules/result/result-view";

export const metadata: Metadata = { title: "Hasil Kuis" };

export default function ResultPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ResultView />
    </Suspense>
  );
}
