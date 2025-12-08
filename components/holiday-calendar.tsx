'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'
import type { Holiday } from '@/lib/data-store'

interface HolidayCalendarProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
}

export default function HolidayCalendar({ store }: HolidayCalendarProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Holiday>>({
    name: '',
    date: '',
    type: 'public',
    recurring: true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (editingId) {
        await store.updateHoliday(editingId, formData)
      } else {
        await store.addHoliday(formData as Omit<Holiday, 'id' | 'createdAt'>)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: '',
        date: '',
        type: 'public',
        recurring: true,
      })
    } catch (error) {
      console.error('Error saving holiday:', error)
      alert('Failed to save holiday. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (holiday: Holiday) => {
    setEditingId(holiday.id)
    setFormData(holiday)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        await store.deleteHoliday(id)
      } catch (error) {
        console.error('Error deleting holiday:', error)
        alert('Failed to delete holiday. Please try again.')
      }
    }
  }

  const getHolidaysByYear = () => {
    const currentYear = new Date().getFullYear()
    const holidaysByYear: Record<number, Holiday[]> = {}
    
    store.holidays.forEach(holiday => {
      if (holiday.recurring) {
        // For recurring holidays, show for current and next year
        for (let year = currentYear; year <= currentYear + 1; year++) {
          if (!holidaysByYear[year]) holidaysByYear[year] = []
          holidaysByYear[year].push({
            ...holiday,
            date: holiday.date.replace(/\d{4}/, year.toString()),
          })
        }
      } else if (holiday.year) {
        if (!holidaysByYear[holiday.year]) holidaysByYear[holiday.year] = []
        holidaysByYear[holiday.year].push(holiday)
      }
    })

    return holidaysByYear
  }

  const holidaysByYear = getHolidaysByYear()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holiday Calendar</h1>
          <p className="text-muted-foreground mt-1">Manage public and company holidays</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Holiday
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Holiday Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., New Year"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public Holiday</SelectItem>
                    <SelectItem value="company">Company Holiday</SelectItem>
                    <SelectItem value="regional">Regional Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!formData.recurring && (
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    placeholder="YYYY"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked, year: checked ? undefined : new Date().getFullYear() })}
              />
              <Label>Recurring (every year)</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(holidaysByYear).map(([year, holidays]) => (
        <Card key={year} className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {year}
            </CardTitle>
            <CardDescription>{holidays.length} holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {holidays
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(holiday => (
                  <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(holiday.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">{holiday.type}</Badge>
                      {holiday.recurring && <Badge variant="secondary">Recurring</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(store.holidays.find(h => h.id === holiday.id)!)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(holiday.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

