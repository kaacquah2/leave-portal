'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { apiRequest } from '@/lib/api-config'

interface BulkUploadResult {
  success: number
  failed: number
  errors: Array<{ row: number; staffId?: string; error: string }>
  warnings: Array<{ row: number; staffId?: string; warning: string }>
}

export default function StaffBulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkUploadResult | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ]
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx)',
          variant: 'destructive',
        })
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        })
        return
      }

      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiRequest('/api/staff/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const data: BulkUploadResult = await response.json()
      setResult(data)

      if (data.success > 0) {
        toast({
          title: 'Upload Successful',
          description: `Successfully imported ${data.success} staff member(s)`,
        })
      }

      if (data.failed > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.success} imported, ${data.failed} failed. Check details below.`,
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error?.message || 'An error occurred during upload',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    // Create CSV template
    const headers = [
      'staffId',
      'firstName',
      'lastName',
      'email',
      'phone',
      'department',
      'position',
      'grade',
      'level',
      'rank',
      'step',
      'directorate',
      'division',
      'unit',
      'dutyStation',
      'joinDate',
      'managerId',
      'immediateSupervisorId',
    ]

    const template = headers.join(',') + '\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'staff-bulk-upload-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Staff Upload</h2>
        <p className="text-muted-foreground mt-1">
          Upload multiple staff members at once using a CSV or Excel file
        </p>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Instructions:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Download the template CSV file below</li>
            <li>Fill in staff information following the template format</li>
            <li>Required fields: staffId, firstName, lastName, email, department, position, grade, level, joinDate</li>
            <li>Optional fields: phone, rank, step, directorate, division, unit, dutyStation, managerId, immediateSupervisorId</li>
            <li>Upload the completed file (max 10MB)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Template Download */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Download Template CSV
        </Button>
        <p className="text-sm text-muted-foreground">
          Use this template to ensure correct formatting
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-4 border rounded-lg p-6">
        <div>
          <Label htmlFor="file">Select File</Label>
          <div className="flex items-center gap-4 mt-2">
            <Input
              id="file"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Staff Data
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold">{result.success}</p>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{result.failed}</p>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-2xl font-bold">{result.warnings.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Errors</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600">
                    <strong>Row {error.row}</strong>
                    {error.staffId && ` (${error.staffId})`}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Warnings</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600">
                    <strong>Row {warning.row}</strong>
                    {warning.staffId && ` (${warning.staffId})`}: {warning.warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

