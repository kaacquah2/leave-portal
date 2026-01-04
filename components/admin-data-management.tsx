'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Upload, Archive, Settings, FileText, Database } from 'lucide-react'
import { useState } from 'react'

export default function AdminDataManagement() {
  const [exportType, setExportType] = useState('staff')
  const [exportFormat, setExportFormat] = useState('json')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('users')
  const [archiveType, setArchiveType] = useState('audit-logs')
  const [archiveDays, setArchiveDays] = useState('365')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleExport = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest(`/api/admin/data/export?type=${exportType}&format=${exportFormat}`)
      
      if (res.ok) {
        if (exportFormat === 'csv') {
          const blob = await res.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.csv`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          setMessage({ type: 'success', text: 'Export completed successfully' })
        } else {
          const data = await res.json()
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.json`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          setMessage({ type: 'success', text: 'Export completed successfully' })
        }
      } else {
        setMessage({ type: 'error', text: 'Export failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Export failed: ' + (error instanceof Error ? error.message : 'Unknown error') })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: 'Please select a file' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const text = await importFile.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        setMessage({ type: 'error', text: 'Invalid JSON file' })
        return
      }

      if (!Array.isArray(data)) {
        setMessage({ type: 'error', text: 'Data must be an array' })
        return
      }

      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/data/import', {
        method: 'POST',
        body: JSON.stringify({ type: importType, data, dryRun: false }),
      })

      if (res.ok) {
        const result = await res.json()
        setMessage({ type: 'success', text: `Import completed: ${result.results.success} successful, ${result.results.failed} failed` })
      } else {
        setMessage({ type: 'error', text: 'Import failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error') })
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/data/archive', {
        method: 'POST',
        body: JSON.stringify({ type: archiveType, olderThanDays: parseInt(archiveDays), dryRun: false }),
      })

      if (res.ok) {
        const result = await res.json()
        setMessage({ type: 'success', text: `Archived ${result.recordsArchived} records` })
      } else {
        setMessage({ type: 'error', text: 'Archive failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Archive failed: ' + (error instanceof Error ? error.message : 'Unknown error') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Management</h1>
        <p className="text-muted-foreground mt-1">Export, import, and archive system data</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
        </div>
      )}

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Export
          </CardTitle>
          <CardDescription>Export system data in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Export Type</Label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="staff">Staff Members</option>
                <option value="users">User Accounts</option>
                <option value="leaves">Leave Requests</option>
                <option value="policies">Leave Policies</option>
              </select>
            </div>
            <div>
              <Label>Format</Label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
          <Button onClick={handleExport} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Exporting...' : 'Export Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Data Import
          </CardTitle>
          <CardDescription>Import data from JSON files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Import Type</Label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="users">User Accounts</option>
              <option value="policies">Leave Policies</option>
            </select>
          </div>
          <div>
            <Label>File (JSON)</Label>
            <Input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleImport} disabled={loading || !importFile}>
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Importing...' : 'Import Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Archive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Archive Old Records
          </CardTitle>
          <CardDescription>Archive or purge records older than specified days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Archive Type</Label>
              <select
                value={archiveType}
                onChange={(e) => setArchiveType(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="audit-logs">Audit Logs</option>
                <option value="notifications">Notifications</option>
              </select>
            </div>
            <div>
              <Label>Older Than (Days)</Label>
              <Input
                type="number"
                value={archiveDays}
                onChange={(e) => setArchiveDays(e.target.value)}
                className="mt-1"
                min="1"
              />
            </div>
          </div>
          <Button onClick={handleArchive} disabled={loading} variant="destructive">
            <Archive className="w-4 h-4 mr-2" />
            {loading ? 'Archiving...' : 'Archive Records'}
          </Button>
        </CardContent>
      </Card>

      {/* Retention Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Retention Policy Configuration
          </CardTitle>
          <CardDescription>Configure data retention periods</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Use the System Settings page to configure retention policies.</p>
          <Button
            onClick={() => window.location.href = '?tab=settings'}
            variant="outline"
            className="mt-4"
          >
            <Settings className="w-4 h-4 mr-2" />
            Go to System Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

