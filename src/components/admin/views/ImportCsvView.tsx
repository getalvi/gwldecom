'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Download, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'

type RowResult = { row: number; status: 'created' | 'failed'; title?: string; error?: string }
type ImportResult = { created: number; failed: number; total: number; results: RowResult[] }

const SAMPLE_CSV = `title,sku,price,stock,category,brand,description,status
Wireless Mouse WM100,WM100-001,450,50,Electronics,Logitech,Compact wireless mouse with USB receiver,published
USB-C Cable 1m,USBC-1M,199,200,Electronics,Samsung,Fast charging USB-C cable 1 meter,published
Coffee Mug 350ml,MUG-350,299,80,Home & Kitchen,Prestige,Ceramic coffee mug 350ml,draft`

export function ImportCsvView() {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
    setResult(null)
  }

  async function doImport() {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/products/import-csv', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      toast({
        title: 'Import complete',
        description: `${data.created} created, ${data.failed} failed`,
      })
    } catch (e: any) {
      toast({ title: e.message || 'Import failed', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bdshop-product-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Bulk Import Products</h1>
          <p className="text-sm text-ink-400">Upload a CSV file to create multiple products at once.</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <FileSpreadsheet size={16} className="text-brand-500" /> CSV Format
        </h2>
        <p className="mb-2 text-xs text-ink-500">
          Required columns: <code className="rounded bg-ink-100 px-1">title</code>,{' '}
          <code className="rounded bg-ink-100 px-1">sku</code>,{' '}
          <code className="rounded bg-ink-100 px-1">price</code>. Optional: stock, category, brand, description, status.
        </p>
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-ink-50 text-left text-ink-500">
              <tr>
                <th className="px-2 py-1.5">title</th>
                <th className="px-2 py-1.5">sku</th>
                <th className="px-2 py-1.5">price</th>
                <th className="px-2 py-1.5">stock</th>
                <th className="px-2 py-1.5">category</th>
                <th className="px-2 py-1.5">brand</th>
                <th className="px-2 py-1.5">status</th>
              </tr>
            </thead>
            <tbody className="text-ink-600">
              <tr className="border-t border-ink-100">
                <td className="px-2 py-1.5">Wireless Mouse</td>
                <td className="px-2 py-1.5">WM100</td>
                <td className="px-2 py-1.5">450</td>
                <td className="px-2 py-1.5">50</td>
                <td className="px-2 py-1.5">Electronics</td>
                <td className="px-2 py-1.5">Logitech</td>
                <td className="px-2 py-1.5">published</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSample}>
          <Download size={14} className="mr-1" /> Download Sample CSV
        </Button>
      </Card>

      {/* Upload */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Upload File</h2>
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-200 p-8 text-center transition hover:border-brand-400"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-400', 'bg-brand-50/30') }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand-400', 'bg-brand-50/30') }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('border-brand-400', 'bg-brand-50/30')
            const f = e.dataTransfer.files?.[0]
            if (f) { setFile(f); setResult(null) }
          }}
        >
          {file ? (
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={24} className="text-brand-500" />
              <span className="text-sm font-medium text-ink-900">{file.name}</span>
              <span className="text-xs text-ink-400">({(file.size / 1024).toFixed(1)} KB)</span>
              <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-ink-400 hover:text-red-500">
                <XCircle size={16} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="mb-2 text-ink-300" />
              <p className="text-sm text-ink-500">Drag &amp; drop a CSV here, or</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
                Choose File
              </Button>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={doImport} disabled={!file || importing} className="bg-brand-500 hover:bg-brand-600">
            {importing ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Upload size={16} className="mr-1" />}
            {importing ? 'Importing...' : 'Import Products'}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result ? (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
            Import Results
            <Badge className="bg-emerald-50 text-emerald-700">{result.created} created</Badge>
            {result.failed > 0 && <Badge className="bg-red-50 text-red-700">{result.failed} failed</Badge>}
          </h2>
          <div className="max-h-64 space-y-1.5 overflow-y-auto scroll-thin">
            {result.results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-md p-2 text-xs ${
                  r.status === 'created' ? 'bg-emerald-50/50' : 'bg-red-50/50'
                }`}
              >
                {r.status === 'created' ? (
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                ) : (
                  <XCircle size={14} className="shrink-0 text-red-500" />
                )}
                <span className="font-medium text-ink-700">Row {r.row}:</span>
                <span className="flex-1 truncate text-ink-600">
                  {r.title || 'Unknown'} {r.error ? `— ${r.error}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/products')}>
              View Products
            </Button>
            <Button size="sm" onClick={() => { setFile(null); setResult(null); if (fileRef.current) fileRef.current.value = '' }} className="bg-brand-500 hover:bg-brand-600">
              Import Another
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
