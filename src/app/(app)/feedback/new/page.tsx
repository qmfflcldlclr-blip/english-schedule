import { getDictionary } from "@/i18n/server";
import { listStudents } from "@/lib/students";
import { isFeedbackKind } from "@/lib/feedback";
import FeedbackForm from "@/components/feedback/FeedbackForm";
import { safeInternalPath } from "@/lib/safe-path";

// 피드백 쓰기: /feedback/new?student=학생ID&back=돌아갈곳
export default async function NewFeedbackPage({ searchParams }: PageProps<"/feedback/new">) {
  const [{ t: all }, students, sp] = await Promise.all([getDictionary(), listStudents(false), searchParams]);
  const preset = students.find((s) => s.id === sp.student);
  const back = safeInternalPath(sp.back, "/feedback");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{all.feedback.newTitle}</h1>
      <FeedbackForm
        t={all.feedback}
        students={students.map((s) => ({ id: s.id, name: s.label }))}
        searchLabels={{ placeholder: all.calendar.searchStudent, noMatch: all.calendar.noMatch }}
        back={back}
        initial={{ studentId: preset?.id ?? "", kind: isFeedbackKind(sp.kind) ? sp.kind : "good", content: "" }}
      />
    </main>
  );
}
