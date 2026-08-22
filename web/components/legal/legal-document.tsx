import { LegalDocument as LegalDocumentType } from "@/types/legal";

interface LegalDocumentProps {
  document: LegalDocumentType;
}

export default function LegalDocument({
  document,
}: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">

      <header className="mb-10 border-b pb-6">

        <h1 className="text-4xl font-bold text-[#0B2D54]">
          {document.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-500">

          <span>
            Version {document.version}
          </span>

          <span>
            Effective {document.effectiveDate}
          </span>

          <span>
            Last Updated {document.lastUpdated}
          </span>

        </div>

      </header>

      <div className="space-y-10">

        {document.sections.map((section, index) => (

          <section key={section.id}>

            <h2 className="mb-4 text-2xl font-semibold text-[#0B2D54]">

              {index + 1}. {section.title}

            </h2>

            <div className="space-y-4">

              {section.content.map((paragraph, i) => (

                <p
                  key={i}
                  className="leading-8 text-slate-700"
                >
                  {paragraph}
                </p>

              ))}

            </div>

          </section>

        ))}

      </div>

    </article>
  );
}