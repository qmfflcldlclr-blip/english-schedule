import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { guides, type GuideSection } from "@/content/guide";

// 글 안의 **굵게** 를 굵은 글씨로
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-gray-900">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Section({ s }: { s: GuideSection }) {
  return (
    <section id={s.id} className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <span aria-hidden>{s.icon}</span>
        {s.title}
      </h2>
      {s.intro && (
        <p className="mt-2 text-gray-700">
          <Rich text={s.intro} />
        </p>
      )}
      {s.steps && (
        <ol className="mt-3 flex flex-col gap-2">
          {s.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-gray-700">
                <Rich text={step} />
              </span>
            </li>
          ))}
        </ol>
      )}
      {s.bullets && (
        <ul className="mt-3 flex flex-col gap-2">
          {s.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-gray-700">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
              <span>
                <Rich text={b} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {s.table && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {s.table.head.map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {s.table.rows.map((row, i) => (
                <tr key={i} className="align-top even:bg-gray-50/60">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-3 py-2 text-gray-700 ${j === 0 ? "font-medium text-gray-900" : ""}`}>
                      <Rich text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.tip && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          💡 <Rich text={s.tip} />
        </p>
      )}
    </section>
  );
}

// 사용 설명서 (홈 → 📖 사용 설명서). 화면 언어에 따라 한국어·영어
export default async function GuidePage() {
  const { locale, t } = await getDictionary();
  const guide = guides[locale];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-gray-600">
        ← {t.guide.backHome}
      </Link>
      <h1 className="mt-1 text-2xl font-bold">📖 {guide.title}</h1>
      <p className="mt-1 text-gray-600">{guide.subtitle}</p>

      {/* 목차: 누르면 그 부분으로 */}
      <nav aria-label={t.guide.toc} className="mt-4 flex flex-wrap gap-1.5">
        {guide.sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex min-h-10 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 text-sm hover:border-brand-300 hover:bg-brand-50"
          >
            <span aria-hidden>{s.icon}</span>
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-5 flex flex-col gap-4">
        {guide.sections.map((s) => (
          <Section key={s.id} s={s} />
        ))}
      </div>

      <a href="#" className="mt-6 flex min-h-11 items-center justify-center text-sm text-gray-500">
        ↑ {t.guide.top}
      </a>
    </main>
  );
}
