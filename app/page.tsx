import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers3,
  ScanText,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
  Workflow,
} from "lucide-react";

const workflows = [
  {
    icon: FileSpreadsheet,
    title: "Freight documents to Excel",
    text: "Extract structured shipment data from invoices, packing lists and transport documents.",
  },
  {
    icon: Layers3,
    title: "Compare shipment documents",
    text: "Spot mismatched quantities, weights, consignee details and references across files.",
  },
  {
    icon: ScanText,
    title: "Scan PDF or image documents",
    text: "Process digital PDFs and scanned JPG, PNG or WEBP documents with AI extraction.",
  },
];

const documentTypes = [
  "Commercial Invoice",
  "Packing List",
  "CMR",
  "Bill of Lading",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950">
            <Truck className="size-5" />
          </span>
          <span className="text-xl">
            Freight<span className="text-cyan-300">Flow</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#documents" className="transition hover:text-white">
            Documents
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden text-sm font-medium text-slate-300 hover:text-white sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Open workspace <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute -left-40 top-10 size-115 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
            <Sparkles className="size-3.5" /> AI-powered freight document
            workflow
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Turn freight paperwork into{" "}
            <span className="text-cyan-300">shipment-ready data.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Extract, review and validate logistics documents—without manually
            retyping every shipment detail.
          </p>
          <p className="mt-3 text-sm font-medium text-cyan-200">
            Start instantly. No account required for document tools.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Try document workspace <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/workspace/compare"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 font-semibold text-white hover:bg-white/5"
            >
              Compare multiple documents
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3.5 font-medium text-white transition hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-cyan-300" />
              PDF & image uploads
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-cyan-300" />
              Editable AI results
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-cyan-300" />
              Excel export
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-cyan-400/10 blur-2xl" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0d1b2b] p-4 shadow-2xl sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-sm font-semibold">
                  Shipment document review
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  AI extraction preview
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                Review ready
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[.8fr_1.2fr] gap-3">
              <div className="rounded-xl border border-white/10 bg-[#091421] p-3">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                  <FileText className="size-4" /> commercial_invoice.pdf
                </div>
                <div className="space-y-2 rounded-lg bg-white p-3">
                  <div className="h-2 w-2/3 rounded bg-slate-300" />
                  <div className="h-1.5 w-full rounded bg-slate-200" />
                  <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                  <div className="mt-4 h-16 rounded border border-slate-200 bg-slate-50" />
                  <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#091421] p-3">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                  <Sparkles className="size-4 text-cyan-300" /> Parsed shipment
                  data
                </div>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-white/5 p-2">
                      <div className="text-[10px] text-slate-500">SHIPPER</div>
                      <div className="mt-1 text-xs">Atlas Trading</div>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <div className="text-[10px] text-slate-500">
                        CONSIGNEE
                      </div>
                      <div className="mt-1 text-xs">North Logistics</div>
                    </div>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <div className="mb-2 flex justify-between text-[10px] text-slate-500">
                      <span>CARGO ITEMS</span>
                      <span>2 rows</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded bg-cyan-300/40" />
                      <div className="h-2 w-4/5 rounded bg-cyan-300/20" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-emerald-400/20 bg-emerald-400/5 p-2 text-xs">
                    <span className="text-slate-300">Excel export</span>
                    <span className="text-emerald-300">Ready ✓</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-3 py-2.5 text-xs text-cyan-100">
              <Workflow className="size-4" /> From document upload to structured
              shipment data
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-white/10 bg-[#0a1726] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-cyan-300">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Less data entry. More control.
            </h2>
            <p className="mt-4 text-slate-400">
              A simple workflow designed around freight documents.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Upload documents",
                desc: "Start with PDF or phone-scanned JPG, PNG and WEBP files.",
              },
              {
                n: "02",
                title: "Review extracted data",
                desc: "AI extracts fields into editable shipment and cargo tables.",
              },
              {
                n: "03",
                title: "Export and verify",
                desc: "Download structured Excel data and review before using it.",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="rounded-2xl border border-white/10 bg-[#0d1b2b] p-6"
              >
                <div className="text-sm font-mono text-cyan-300">
                  STEP {step.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-6 text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-cyan-300">
            Built for freight workflows
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            More than a file converter
          </h2>
          <p className="mt-4 text-slate-400">
            Generic converters change file formats. FreightFlow focuses on
            extracting logistics data and helping teams review shipment
            information.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {workflows.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/3 p-6"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="documents"
        className="border-y border-white/10 bg-[#0a1726] py-14"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              Documents FreightFlow is designed for
            </h2>
            <p className="mt-2 text-slate-400">
              Start with the core documents used in international freight.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="rounded-3xl border border-cyan-300/20 bg-linear-to-br from-cyan-300/10 to-blue-500/5 p-8 sm:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm text-cyan-200">
                <ShieldCheck className="size-4" /> Human review stays in control
              </div>
              <h2 className="mt-3 text-3xl font-semibold">
                Make freight paperwork easier to process.
              </h2>
              <p className="mt-3 text-slate-300">
                Extract data, review it, and export when it’s ready. AI results
                should always be checked before operational use.
              </p>
            </div>
            <Link
              href="/workspace"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3.5 font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Open FreightFlow <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} FreightFlow · AI-assisted freight document
        processing
      </footer>
    </main>
  );
}
