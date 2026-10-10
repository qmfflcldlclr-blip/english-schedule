import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getStudent } from "@/lib/students";
import { todayIn } from "@/lib/credit-math";
import PlanForm from "@/components/PlanForm";

export default async function NewPlanPage({
  params,
}: PageProps<"/students/[id]/plans/new">) {
  const { id } = await params;
  const [{ t }, profile, student] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getStudent(id),
  ]);
  if (!student) notFound();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <p className="text-sm text-gray-500">{student.label}</p>
      <h1 className="mb-6 text-2xl font-bold">{t.credits.newPlanTitle}</h1>
      <PlanForm
        t={t.credits}
        studentId={student.id}
        today={todayIn(profile?.timezone ?? "UTC")}
      />
    </main>
  );
}
