import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getStudent } from "@/lib/students";
import AdjustForm from "@/components/AdjustForm";

export default async function AdjustPage({
  params,
}: PageProps<"/students/[id]/adjust">) {
  const { id } = await params;
  const [{ t }, student] = await Promise.all([getDictionary(), getStudent(id)]);
  if (!student) notFound();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <p className="text-sm text-gray-500">{student.name}</p>
      <h1 className="mb-6 text-2xl font-bold">{t.credits.adjustTitle}</h1>
      <AdjustForm t={t.credits} studentId={student.id} />
    </main>
  );
}
