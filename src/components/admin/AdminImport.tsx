'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Download, Upload, Check, X, Eye, RefreshCw, ExternalLink, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ImportItem {
  id: string;
  url: string;
  status: string;
  confidence: number | null;
  extracted: string | null;
  warnings: string;
  errorMessage: string | null;
  durationMs: number | null;
  resultingProductId: string | null;
  createdAt: string;
}

interface ImportJob {
  id: string;
  type: string;
  status: string;
  sourceInput: string;
  progressTotal: number;
  progressDone: number;
  progressFailed: number;
  resultSummary: string | null;
  errorMessage: string | null;
  autoPublish: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: ImportItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  extracting: 'bg-blue-100 text-blue-800',
  preview: 'bg-purple-100 text-purple-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  imported: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
};

export default function AdminImport() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [starting, setStarting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await fetchJobs();
    setLoading(false);
  }, [fetchJobs]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh when there are running jobs
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === 'running' || j.status === 'pending');
    if (hasRunning) {
      pollRef.current = setInterval(fetchJobs, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobs, fetchJobs]);

  const handleStartImport = async () => {
    if (!url.trim()) { toast.error('URL is required'); return; }
    setStarting(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url.trim()] }),
      });
      if (res.ok) {
        toast.success('Import job started');
        setUrl('');
        fetchJobs();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to start import');
      }
    } catch {
      toast.error('Failed to start import');
    } finally {
      setStarting(false);
    }
  };

  const openJobDetail = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    if (job.items && job.items.length > 0) {
      setSelectedJob(job);
      return;
    }

    setItemsLoading(true);
    try {
      const res = await fetch(`/api/admin/import/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(data);
      }
    } catch {}
    setItemsLoading(false);
  };

  const handleItemAction = async (jobId: string, itemId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/import/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action }),
      });
      if (res.ok) {
        toast.success(`Item ${action}d`);
        // Refresh the detail
        openJobDetail(jobId);
        fetchJobs();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed');
      }
    } catch {
      toast.error('Failed to update item');
    }
  };

  const handleBulkAction = async (jobId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/import/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`All items ${action}d`);
        openJobDetail(jobId);
        fetchJobs();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed');
      }
    } catch {
      toast.error('Bulk action failed');
    }
  };

  if (loading) return <LoadingState type="list" count={3} />;

  return (
    <div className="space-y-6">
      {/* Import Input */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-600" />
            Import Products via AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter product URL to import..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleStartImport()}
            />
            <Button onClick={handleStartImport} disabled={starting || !url.trim()}>
              {starting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</> : <><Download className="h-4 w-4 mr-2" /> Import</>}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Paste a product page URL. AI will extract product data automatically.</p>
        </CardContent>
      </Card>

      {/* Job History */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Import History</h3>
        {jobs.length === 0 ? (
          <EmptyState icon={Download} title="No imports yet" description="Start by entering a product URL above." />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const progress = job.progressTotal > 0 ? Math.round((job.progressDone / job.progressTotal) * 100) : 0;
              return (
                <Card key={job.id} className="rounded-xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => openJobDetail(job.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={STATUS_COLORS[job.status] || ''}>
                          {job.status}
                        </Badge>
                        <span className="text-xs text-gray-400">{format(new Date(job.createdAt), 'MMM dd, HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {job.progressDone > 0 && <span>{job.progressDone}/{job.progressTotal}</span>}
                        {job.progressFailed > 0 && <span className="text-red-500">{job.progressFailed} failed</span>}
                      </div>
                    </div>

                    {(job.status === 'running' || job.status === 'pending') && (
                      <Progress value={progress} className="h-2" />
                    )}

                    {job.errorMessage && (
                      <p className="text-xs text-red-500 mt-2">{job.errorMessage}</p>
                    )}

                    {/* Source URLs preview */}
                    <div className="mt-2 text-xs text-gray-400 truncate">
                      {(() => {
                        try {
                          const input = JSON.parse(job.sourceInput);
                          return Array.isArray(input?.urls) ? input.urls.join(', ') : input.url || '';
                        } catch {
                          return job.sourceInput;
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Job Details</DialogTitle>
          </DialogHeader>
          {itemsLoading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : selectedJob ? (
            <div className="space-y-4">
              {/* Job Summary */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={STATUS_COLORS[selectedJob.status] || ''}>{selectedJob.status}</Badge>
                <span className="text-sm text-gray-500">Created {format(new Date(selectedJob.createdAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>

              {/* Bulk Actions */}
              {(selectedJob.status === 'completed' || selectedJob.status === 'failed') && selectedJob.items && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleBulkAction(selectedJob.id, 'approve')}>
                    <Check className="h-4 w-4 mr-1" /> Approve All
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleBulkAction(selectedJob.id, 'reject')}>
                    <X className="h-4 w-4 mr-1" /> Reject All
                  </Button>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                {selectedJob.items?.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="secondary" className={ITEM_STATUS_COLORS[item.status] || ''}>
                          {item.status}
                        </Badge>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate">
                          {item.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.confidence != null && (
                          <span className={`text-xs font-medium ${item.confidence >= 0.8 ? 'text-emerald-600' : item.confidence >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                            {Math.round(item.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extracted Data Preview */}
                    {item.extracted && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        {(() => {
                          try {
                            const data = JSON.parse(item.extracted);
                            return (
                              <div className="space-y-2 text-sm">
                                {data.title && <p className="font-medium text-gray-900">{data.title}</p>}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {data.price && <p>Price: <span className="font-medium">{CURRENCY_SYMBOL}{data.price}</span></p>}
                                  {data.category && <p>Category: {data.category}</p>}
                                  {data.brand && <p>Brand: {data.brand}</p>}
                                </div>
                                {data.description && (
                                  <p className="text-gray-600 text-xs line-clamp-2">{data.description}</p>
                                )}
                                {data.images?.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {data.images.slice(0, 3).map((img: string, idx: number) => (
                                      <img key={idx} src={img} alt="" className="h-16 w-16 rounded object-cover bg-white" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          } catch {
                            return <pre className="text-xs text-gray-600 overflow-x-auto max-h-24">{item.extracted}</pre>;
                          }
                        })()}
                      </div>
                    )}

                    {item.errorMessage && (
                      <p className="text-xs text-red-500">Error: {item.errorMessage}</p>
                    )}

                    {/* Item Actions */}
                    {(item.status === 'preview' || item.status === 'extracting') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600"
                          onClick={() => handleItemAction(selectedJob.id, item.id, 'approve')}
                          disabled={item.status === 'extracting'}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleItemAction(selectedJob.id, item.id, 'reject')}
                          disabled={item.status === 'extracting'}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}

                    {item.resultingProductId && (
                      <p className="text-xs text-emerald-600">Product created successfully</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
