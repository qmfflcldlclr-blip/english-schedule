import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getStudent } from "@/lib/students";
import StudentForm from "@/components/StudentForm";

export default async function EditStudentPage({
  params,
}: PageProps<"/students/[id]/edit">) {
  const { id } = await params;
  const [{ t }, student] = await Promise.all([getDictionary(), getStudent(id)]);
  if (!student) notFound();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t.students.editTitle}</h1>
      <StudentForm
        t={t.students}
        student={student}
        cancelHref={`/students/${student.id}`}
      />
    </main>
  );
}
