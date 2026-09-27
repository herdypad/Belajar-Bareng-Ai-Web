import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/ui";
import { QuizRunnerView } from "@/modules/quiz-runner/quiz-runner-view";

export const metadata: Metadata = { title: "Mengerjakan Kuis" };

export default function QuizPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <QuizRunnerView />
    </Suspense>
  );
}
