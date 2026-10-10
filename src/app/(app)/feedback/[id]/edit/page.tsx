import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getFeedback } from "@/lib/feedback";
import FeedbackForm from "@/components/feedback/FeedbackForm";
import { safeInternalPath } from "@/lib/safe-path";

// 피드백 고치기 (쓴 사람만)
export default async function EditFeedbackPage({ params, searchParams }: PageProps<"/feedback/[id]/edit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [{ t: all }, profile, feedback] = await Promise.all([getDictionary(), getCurrentProfile(), getFeedback(id)]);
  if (!feedback || feedback.createdBy !== profile?.id) notFound();
  const back = safeInternalPath(sp.back, "/feedback");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{all.feedback.editTitle}</h1>
      <FeedbackForm
        t={all.feedback}
        students={[]}
        searchLabels={{ placeholder: "", noMatch: "" }}
        back={back}
        initial={{ id: feedback.id, studentId: feedback.studentId, studentName: feedback.studentName, kind: feedback.kind, content: feedback.content }}
      />
    </main>
  );
}
