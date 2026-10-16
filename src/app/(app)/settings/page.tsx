import { getDictionary } from "@/i18n/server";
import { getSettings } from "@/lib/settings";
import ZoomForm from "@/components/ZoomForm";

export default async function SettingsPage() {
  const [{ t: all }, settings] = await Promise.all([getDictionary(), getSettings()]);
  const t = all.settings;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <h2 className="font-semibold">{t.zoomTitle}</h2>
        <p className="mt-1 mb-3 text-sm text-gray-500">{t.zoomHint}</p>
        <ZoomForm t={t} initial={settings.zoomUrl ?? ""} />
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <h2 className="font-semibold">{t.rulesTitle}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">{t.ruleUnits}</dt>
          <dd>{t.ruleUnitsValue}</dd>
          <dt className="text-gray-500">{t.ruleAbsent}</dt>
          <dd>{t.ruleAbsentValue}</dd>
          <dt className="text-gray-500">{t.rulePostpone}</dt>
          <dd>{t.rulePostponeValue}</dd>
          <dt className="text-gray-500">{t.rulePlans}</dt>
          <dd>{t.rulePlansValue}</dd>
        </dl>
      </section>
    </main>
  );
}
