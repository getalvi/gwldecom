"use client";

import { useState } from "react";
import { Link2, List, Globe, Search, FileText, History } from "lucide-react";
import { ImportStats } from "./ImportStats";
import { JobQueue } from "./JobQueue";
import { JobDetail } from "./JobDetail";
import { UrlImportTab } from "./tabs/UrlImportTab";
import { BulkImportTab } from "./tabs/BulkImportTab";
import { CrawlTab } from "./tabs/CrawlTab";
import { SearchImportTab } from "./tabs/SearchImportTab";
import { SitemapTab } from "./tabs/SitemapTab";
import type { ImportConfig } from "@/lib/importer/interfaces";

const TABS = [
  { id: "url", label: "URL Import", icon: Link2 },
  { id: "bulk", label: "Bulk Import", icon: List },
  { id: "crawl", label: "Crawl Category", icon: Globe },
  { id: "search", label: "Search Import", icon: Search },
  { id: "sitemap", label: "Sitemap", icon: FileText },
  { id: "history", label: "History", icon: History },
] as const;

type TabId = typeof TABS[number]["id"];

export function AIImportClient() {
  const [activeTab, setActiveTab] = useState<TabId>("url");
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [config, setConfig] = useState<ImportConfig>({});

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">AI Product Importer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Import products from Amazon, AliExpress, Daraz, Shopify, WooCommerce, eBay, and any ecommerce site.
        </p>
      </div>

      <ImportStats />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: import form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab nav */}
          <div className="flex gap-1 overflow-x-auto bg-secondary/30 rounded-xl p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "url" && <UrlImportTab config={config} onConfigChange={setConfig} onJobCreated={setSelectedJobId} />}
            {activeTab === "bulk" && <BulkImportTab config={config} onConfigChange={setConfig} onJobCreated={setSelectedJobId} />}
            {activeTab === "crawl" && <CrawlTab config={config} onConfigChange={setConfig} onJobCreated={setSelectedJobId} />}
            {activeTab === "search" && <SearchImportTab config={config} onConfigChange={setConfig} onJobCreated={setSelectedJobId} />}
            {activeTab === "sitemap" && <SitemapTab config={config} onConfigChange={setConfig} onJobCreated={setSelectedJobId} />}
            {activeTab === "history" && <HistoryView />}
          </div>

          {/* Job detail (shows when a job is selected) */}
          {selectedJobId && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Import Results</h2>
                <button onClick={() => setSelectedJobId(undefined)} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <JobDetail jobId={selectedJobId} />
            </div>
          )}
        </div>

        {/* Right: job queue sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-background p-4 sticky top-20">
            <h2 className="font-semibold text-sm mb-3">Import Queue</h2>
            <JobQueue onSelectJob={setSelectedJobId} selectedJobId={selectedJobId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView() {
  const [jobs, setJobs] = useState<Array<{
    id: string; type: string; status: string; progress_total: number;
    progress_done: number; progress_failed: number; created_at: string;
  }>>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    fetch("/api/importer/jobs").then(r => r.json()).then(d => { setJobs(d.jobs ?? []); setLoaded(true); });
    return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 shimmer rounded-lg" />)}</div>;
  }

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/30">
          <tr>{["Type","Total","Done","Failed","Status","Date"].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {jobs.map(j => (
            <tr key={j.id} className="hover:bg-secondary/20">
              <td className="px-3 py-2 text-xs capitalize">{j.type}</td>
              <td className="px-3 py-2 text-xs">{j.progress_total}</td>
              <td className="px-3 py-2 text-xs text-success">{j.progress_done}</td>
              <td className="px-3 py-2 text-xs text-destructive">{j.progress_failed}</td>
              <td className="px-3 py-2 text-xs capitalize">{j.status}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No import history yet</p>}
    </div>
  );
}
