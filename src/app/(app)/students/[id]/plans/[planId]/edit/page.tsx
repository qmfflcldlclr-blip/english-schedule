import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getStudent } from "@/lib/students";
import { getPlan } from "@/lib/credits";
import { todayIn } from "@/lib/credit-math";
import PlanForm from "@/components/PlanForm";

export default async function EditPlanPage({
  params,
}: PageProps<"/students/[id]/plans/[planId]/edit">) {
  const { id, planId } = await params;
  const [{ t }, profile, student, plan] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getStudent(id),
    getPlan(planId),
  ]);
  if (!student || !plan || plan.student_id !== student.id) notFound();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <p className="text-sm text-gray-500">{student.name}</p>
      <h1 className="mb-6 text-2xl font-bold">{t.credits.editPlanTitle}</h1>
      <PlanForm
        t={t.credits}
        studentId={student.id}
        today={todayIn(profile?.timezone ?? "UTC")}
        plan={plan}
      />
    </main>
  );
}
