import type { Metadata } from "next";
import { CreateQuizView } from "@/modules/create-quiz/create-quiz-view";

export const metadata: Metadata = { title: "Buat Kuis" };

export default function CreatePage() {
  return <CreateQuizView />;
}
