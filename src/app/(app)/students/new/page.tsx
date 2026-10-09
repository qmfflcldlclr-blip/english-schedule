import { getDictionary } from "@/i18n/server";
import StudentForm from "@/components/StudentForm";

export default async function NewStudentPage() {
  const { t } = await getDictionary();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t.students.newTitle}</h1>
      <StudentForm t={t.students} cancelHref="/students" />
    </main>
  );
}
