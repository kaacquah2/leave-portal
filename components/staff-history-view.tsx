'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface StaffHistoryEntry {
  id: string
  fieldName: string
  oldValue: string | null
  newValue: string
  effectiveFrom: string
  effectiveTo: string | null
  changedBy: string
  changeReason: string | null
  snapshotAt: string | null
}

interface StaffHistoryViewProps {
  staffId: string
}

export default function StaffHistoryView({ staffId }: StaffHistoryViewProps) {
  const [history, setHistory] = useState<StaffHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [atTime, setAtTime] = useState('')
  const [snapshot, setSnapshot] = useState<any>(null)

  useEffect(() => {
    loadHistory()
  }, [staffId])

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/staff/${staffId}/history`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSnapshot = async () => {
    if (!atTime) return

    try {
      const response = await fetch(`/api/staff/${staffId}/snapshot?at=${atTime}`)
      if (response.ok) {
        const data = await response.json()
        setSnapshot(data)
      }
    } catch (error) {
      console.error('Error loading snapshot:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff History</CardTitle>
          <CardDescription>Historical changes to staff record</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>View Staff Data At Specific Time</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="datetime-local"
                  value={atTime}
                  onChange={(e) => setAtTime(e.target.value)}
                  placeholder="Select date and time"
                />
                <Button onClick={loadSnapshot}>Load Snapshot</Button>
              </div>
            </div>

            {snapshot && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Snapshot at {new Date(atTime).toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Grade:</strong> {snapshot.grade}</div>
                    <div><strong>Rank:</strong> {snapshot.rank || 'N/A'}</div>
                    <div><strong>Position:</strong> {snapshot.position}</div>
                    <div><strong>Step:</strong> {snapshot.step || 'N/A'}</div>
                    <div><strong>Department:</strong> {snapshot.department}</div>
                    <div><strong>Directorate:</strong> {snapshot.directorate || 'N/A'}</div>
                    <div><strong>Unit:</strong> {snapshot.unit || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Change History</h3>
              {history.length === 0 ? (
                <p className="text-muted-foreground">No history entries found</p>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Field:</strong> {entry.fieldName}</div>
                          <div><strong>Changed By:</strong> {entry.changedBy}</div>
                          <div><strong>Old Value:</strong> {entry.oldValue || 'N/A'}</div>
                          <div><strong>New Value:</strong> {entry.newValue}</div>
                          <div><strong>Effective From:</strong> {new Date(entry.effectiveFrom).toLocaleDateString()}</div>
                          <div><strong>Effective To:</strong> {entry.effectiveTo ? new Date(entry.effectiveTo).toLocaleDateString() : 'Current'}</div>
                          {entry.changeReason && (
                            <div className="col-span-2"><strong>Reason:</strong> {entry.changeReason}</div>
                          )}
                          {entry.snapshotAt && (
                            <div className="col-span-2 text-xs text-muted-foreground">
                              Snapshot taken at: {new Date(entry.snapshotAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

