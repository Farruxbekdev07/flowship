'use client'

import { useState } from 'react'
import { BadgeCheck, ChevronDown, Download, FileCheck2, FileText, GripVertical, Minus, Plus, RotateCw, Save, ScanLine, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fields = {
  shipment: [
    ['Shipper name', 'Nordic Components GmbH'],
    ['Address', 'Hafenstrasse 18, 20457 Hamburg, DE'],
    ['Consignee name', 'Atlas Retail Distribution'],
    ['Delivery destination', 'Via Roma 42, 20121 Milano, IT'],
  ],
  transport: [
    ['Truck license plate', 'HH · NR 4821'],
    ['Trailer number', 'TR-9084-KL'],
    ['Carrier name', 'EuroTrans Logistics S.p.A.'],
    ['Driver ID', 'DRV-20841'],
  ],
}

const cargo = [
  ['Electronic control units', '8537 10 99', '24', '8,420', '12.80'],
  ['Aluminium mounting brackets', '7616 99 90', '18', '3,180', '8.40'],
  ['Protective packaging', '3923 90 00', '6', '420', '2.10'],
]

function Section({ title, eyebrow, children, defaultOpen = true }: { title: string; eyebrow: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-slate-200 bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50" aria-expanded={open}>
        <span className="flex items-center gap-3"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{eyebrow}</span><span className="text-[13px] font-semibold text-slate-800">{title}</span></span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span><input defaultValue={value} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-[12px] text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100" /></label>
}

function DocumentPreview() {
  const [zoom, setZoom] = useState(100)
  return <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2"><div className="flex size-7 items-center justify-center rounded-md bg-sky-600 text-white"><ScanLine className="size-4" /></div><div><p className="text-[12px] font-semibold text-slate-800">Source document</p><p className="font-mono text-[10px] text-slate-400">CMR_2024_88421.pdf · 2 pages</p></div></div>
      <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5"><Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom(Math.max(70, zoom - 10))} aria-label="Zoom out"><ZoomOut className="size-3.5" /></Button><span className="w-10 text-center font-mono text-[10px] text-slate-500">{zoom}%</span><Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom(Math.min(140, zoom + 10))} aria-label="Zoom in"><ZoomIn className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-7" aria-label="Rotate document"><RotateCw className="size-3.5" /></Button></div>
    </div>
    <div className="min-h-0 flex-1 overflow-auto px-8 py-7">
      <div className="mx-auto flex w-[480px] origin-top flex-col gap-4 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.12)] transition-transform" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4"><div><div className="mb-1 text-[10px] font-bold tracking-[0.25em] text-slate-500">INTERNATIONAL ROAD TRANSPORT</div><h2 className="font-serif text-[27px] font-bold tracking-tight text-slate-900">CMR</h2></div><div className="text-right font-mono text-[9px] text-slate-500"><p>No. 88421</p><p className="mt-1">COPY 1 — CONSIGNOR</p></div></div>
        <div className="grid grid-cols-2 gap-0 border border-slate-400 text-[9px] text-slate-700"><div className="border-b border-r border-slate-300 p-2"><b>1. Sender</b><div className="mt-3 h-8 w-4/5 rounded bg-slate-200/70"/><div className="mt-1 h-2 w-3/5 rounded bg-slate-200"/></div><div className="border-b border-slate-300 p-2"><b>2. Consignee</b><div className="mt-3 h-8 w-4/5 rounded bg-slate-200/70"/><div className="mt-1 h-2 w-3/5 rounded bg-slate-200"/></div><div className="border-r border-slate-300 p-2"><b>3. Place of delivery</b><div className="mt-4 h-2 w-4/5 rounded bg-slate-200"/><div className="mt-2 h-2 w-3/5 rounded bg-slate-200"/></div><div className="p-2"><b>4. Place / date of taking over</b><div className="mt-4 h-2 w-4/5 rounded bg-slate-200"/><div className="mt-2 h-2 w-3/5 rounded bg-slate-200"/></div></div>
        <div className="border border-slate-400"><div className="grid grid-cols-[1.5fr_1fr_.65fr_.8fr] border-b border-slate-300 bg-slate-100 p-2 text-[8px] font-bold uppercase"><span>Description</span><span>HS code</span><span>Pkgs</span><span>Gross kg</span></div>{[1,2,3,4].map(i => <div key={i} className="grid grid-cols-[1.5fr_1fr_.65fr_.8fr] border-b border-slate-200 p-2 text-[8px] last:border-0"><span className="h-2 w-4/5 rounded bg-slate-200"/><span className="h-2 w-3/5 rounded bg-slate-200"/><span className="h-2 w-1/2 rounded bg-slate-200"/><span className="h-2 w-3/5 rounded bg-slate-200"/></div>)}</div>
        <div className="grid grid-cols-3 gap-3 border-t border-slate-400 pt-4 text-[8px] text-slate-500"><span>Gross weight: <b className="text-slate-800">12,020 kg</b></span><span>Volume: <b className="text-slate-800">23.30 m³</b></span><span>Packages: <b className="text-slate-800">48</b></span></div><div className="mt-4 h-16 rounded border border-dashed border-slate-300 bg-slate-50" />
      </div>
    </div>
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 py-2"><div className="flex items-center gap-2 text-[11px] text-slate-500"><FileText className="size-3.5" /> Page 1 of 2 <span className="text-slate-300">|</span> 2.4 MB</div><div className="flex items-center gap-1.5"><Button variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]"><Upload className="size-3" /> Upload new document</Button></div></div>
  </div>
}

export function LogisticsDashboard() {
  const [saved, setSaved] = useState(false)
  return <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-slate-50 text-slate-900">
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-white"><FileCheck2 className="size-4" /></div><div><h1 className="text-[14px] font-bold tracking-tight">FreightFlow <span className="font-normal text-slate-400">/ Document review</span></h1><p className="font-mono text-[10px] text-slate-400">INBOUND QUEUE · 14 DOCUMENTS</p></div></div><div className="flex items-center gap-3"><div className="hidden items-center gap-1.5 text-[11px] text-slate-500 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" /> AI extraction engine online</div><div className="size-7 rounded-full bg-slate-800 text-center text-[11px] leading-7 text-white">JD</div></div></header>
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row"><div className="flex min-h-[380px] w-full min-w-0 flex-col border-r border-slate-200 lg:w-[45%]"><DocumentPreview /></div><div className="flex min-h-0 w-full min-w-0 flex-col bg-slate-50 lg:w-[55%]"><div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3"><div><div className="mb-1 flex items-center gap-2"><h2 className="text-[14px] font-semibold text-slate-900">Parsed shipment data</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><BadgeCheck className="mr-1 inline size-3" /> Parsed successfully</span></div><p className="font-mono text-[10px] text-slate-400">LAST PROCESSED 09:42:18 UTC · 18 FIELDS EXTRACTED</p></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]"><Download className="size-3.5" /> Export</Button><Button size="sm" className="h-8 gap-1.5 bg-sky-600 text-[11px] hover:bg-sky-700" onClick={() => setSaved(true)}><Save className="size-3.5" /> {saved ? 'Saved' : 'Confirm & save'}</Button></div></div><div className="flex-1 overflow-y-auto"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2"><span className="text-[11px] font-medium text-slate-500">Review extracted fields</span><span className="font-mono text-[10px] text-slate-400">CONFIDENCE <b className="text-emerald-600">94.6%</b></span></div><Section title="Shipper & consignee info" eyebrow="01"><div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{fields.shipment.map(([label, value]) => <Field key={label} label={label} value={value} />)}</div></Section><Section title="Transport & vehicle details" eyebrow="02"><div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{fields.transport.map(([label, value]) => <Field key={label} label={label} value={value} />)}</div></Section><Section title="Cargo & items" eyebrow="03"><div className="overflow-x-auto rounded-md border border-slate-200"><table className="w-full min-w-[620px] border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-400"><th className="w-8 px-2 py-2"></th><th className="px-2 py-2 font-medium">Description</th><th className="px-2 py-2 font-medium">HS code</th><th className="px-2 py-2 font-medium">Packages</th><th className="px-2 py-2 font-medium">Gross kg</th><th className="px-2 py-2 font-medium">Volume m³</th></tr></thead><tbody>{cargo.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0"><td className="px-2 py-1.5 text-slate-300"><GripVertical className="size-3" /></td>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-1.5"><input defaultValue={cell} aria-label={`${row[0]} ${cellIndex}`} className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] text-slate-700 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100" /></td>)}</tr>)}</tbody></table></div><button className="mt-3 text-[11px] font-medium text-sky-600 hover:text-sky-700">+ Add cargo line</button></Section><Section title="Additional document metadata" eyebrow="04" defaultOpen={false}><div className="grid grid-cols-2 gap-3"><Field label="Document type" value="CMR consignment note" /><Field label="Reference number" value="DE-HH-88421" /></div></Section></div><div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-5 py-2 text-[10px] text-slate-400"><Minus className="size-3" /> Changes are auto-drafted <span className="ml-auto">Tab through fields to validate quickly</span></div></div></div>
  </main>
}
