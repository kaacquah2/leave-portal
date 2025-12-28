'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, Play, CheckCircle, AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface ProcessingResult {
  staffId: string
  results: Array<{
    leaveType: string
    currentBalance: number
    carryForwardDays: number
    forfeitedDays: number
    newBalance: number
  }>
  processedAt: string
}

export default function YearEndProcessing() {
  const { toast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [processAll, setProcessAll] = useState(true)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [staffList, setStaffList] = useState<Array<{ staffId: string; firstName: string; lastName: string }>>([])

  useEffect(() => {
    if (!processAll) {
      fetchStaffList()
    }
  }, [processAll])

  const fetchStaffList = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaffList(data.filter((s: any) => s.active))
      }
    } catch (error) {
      console.error('Error fetching staff list:', error)
    }
  }

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/leave-rules/year-end', {
        method: 'POST',
        body: JSON.stringify({
          processAll,
          ...(processAll ? {} : { staffId: selectedStaffId }),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.results) {
          setResults(data.results)
        } else {
          setResults([data])
        }
        toast({
          title: 'Success',
          description: `Year-end processing completed for ${processAll ? 'all staff' : 'selected staff'}`,
        })
        setShowConfirmDialog(false)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process year-end leave')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process year-end leave',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const exportResults = () => {
    if (results.length === 0) return

    const csv = [
      ['Staff ID', 'Leave Type', 'Current Balance', 'Carry Forward', 'Forfeited', 'New Balance'],
      ...results.flatMap(result =>
        result.results.map(r => [
          result.staffId,
          r.leaveType,
          r.currentBalance.toString(),
          r.carryForwardDays.toString(),
          r.forfeitedDays.toString(),
          r.newBalance.toString(),
        ])
      ),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `year-end-processing-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getTotalStats = () => {
    const totals = {
      carryForward: 0,
      forfeited: 0,
      staffProcessed: results.length,
    }

    results.forEach(result => {
      result.results.forEach(r => {
        totals.carryForward += r.carryForwardDays
        totals.forfeited += r.forfeitedDays
      })
    })

    return totals
  }

  const stats = getTotalStats()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Year-End Leave Processing</h1>
          <p className="text-muted-foreground mt-1">Process leave carry-forward and forfeiture for all staff</p>
        </div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <Button variant="outline" onClick={exportResults}>
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          )}
          <Button onClick={() => setShowConfirmDialog(true)} disabled={processing}>
            <Play className="w-4 h-4 mr-2" />
            Process Year-End
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          <strong>Important:</strong> Year-end processing will calculate carry-forward and forfeiture based on leave policies.
          This action will update leave balances for all staff members. Make sure to review policies before processing.
        </AlertDescription>
      </Alert>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Staff Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.staffProcessed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Carry-Forward</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{stats.carryForward.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">Days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Forfeited</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{stats.forfeited.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">Days</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
              <CardDescription>Detailed results of year-end processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {results.map((result, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Staff ID: {result.staffId}</h3>
                        <p className="text-sm text-muted-foreground">
                          Processed: {format(new Date(result.processedAt), 'PPpp')}
                        </p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Current Balance</TableHead>
                          <TableHead>Carry Forward</TableHead>
                          <TableHead>Forfeited</TableHead>
                          <TableHead>New Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.results.map((r, rIdx) => (
                          <TableRow key={rIdx}>
                            <TableCell className="font-medium">{r.leaveType}</TableCell>
                            <TableCell>{r.currentBalance.toFixed(1)}</TableCell>
                            <TableCell>
                              <Badge variant={r.carryForwardDays > 0 ? 'default' : 'secondary'}>
                                {r.carryForwardDays.toFixed(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.forfeitedDays > 0 ? 'destructive' : 'secondary'}>
                                {r.forfeitedDays.toFixed(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{r.newBalance.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {results.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Process</CardTitle>
            <CardDescription>
              Click "Process Year-End" to calculate carry-forward and forfeiture for all staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No processing results yet</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Year-End Processing</DialogTitle>
            <DialogDescription>
              This will process leave carry-forward and forfeiture for {processAll ? 'all active staff members' : 'the selected staff member'}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Processing Scope</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={processAll ? 'default' : 'outline'}
                  onClick={() => setProcessAll(true)}
                  className="flex-1"
                >
                  All Staff
                </Button>
                <Button
                  variant={!processAll ? 'default' : 'outline'}
                  onClick={() => setProcessAll(false)}
                  className="flex-1"
                >
                  Single Staff
                </Button>
              </div>
            </div>

            {!processAll && (
              <div>
                <Label htmlFor="staffId">Staff Member</Label>
                <Select
                  value={selectedStaffId}
                  onValueChange={setSelectedStaffId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map(staff => (
                      <SelectItem key={staff.staffId} value={staff.staffId}>
                        {staff.firstName} {staff.lastName} ({staff.staffId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Make sure all leave policies are correctly configured before processing.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                disabled={processing || (!processAll && !selectedStaffId)}
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Process
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

