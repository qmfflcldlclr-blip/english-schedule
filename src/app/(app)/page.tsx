import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";

export default async function Home() {
  const [{ t }, profile] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">
        {format(t.home.greeting, { name: profile?.display_name ?? "" })}
      </h1>
      <p className="mt-2 text-gray-600">{t.home.comingSoon}</p>
    </main>
  );
}
