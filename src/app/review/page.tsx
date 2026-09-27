import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/ui";
import { ReviewView } from "@/modules/review/review-view";

export const metadata: Metadata = { title: "Review Soal" };

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ReviewView />
    </Suspense>
  );
}
