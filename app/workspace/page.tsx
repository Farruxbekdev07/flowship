import Link from "next/link";
import { LogisticsDashboard } from "@/components/logistics/logistics-dashboard";
import { AccountMenu } from "@/components/account/account-menu";

export default function Page() {
  return <><div className="border-b bg-white px-5 py-3"><div className="mx-auto flex max-w-7xl items-center justify-end gap-4 text-sm"><AccountMenu/><Link href="/workspace/shipments" className="font-medium text-slate-600 hover:text-cyan-700">Shipment management</Link><Link href="/workspace/compare" className="font-medium text-slate-600 hover:text-cyan-700">Compare documents</Link></div></div><LogisticsDashboard /></>;
}
