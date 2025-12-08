'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, DollarSign } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'

interface EmployeePayslipsProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeePayslips({ store, staffId }: EmployeePayslipsProps) {
  const payslips = store.payslips
    .filter(p => p.staffId === staffId)
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())

  const handleDownload = (payslipId: string) => {
    // In a real app, this would download the PDF
    console.log('Downloading payslip:', payslipId)
    alert('Payslip download functionality would be implemented here')
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">Payslips & Salary</h1>
        <p className="text-muted-foreground mt-1">View your payslips and salary information</p>
      </div>

      {payslips.length === 0 ? (
        <Card className="border-2 border-blue-200">
          <CardContent className="py-12">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payslips available</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payslips.map(payslip => (
            <Card key={payslip.id} className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{formatMonth(payslip.month)}</CardTitle>
                    <CardDescription>{payslip.year}</CardDescription>
                  </div>
                  <Badge variant="outline">{payslip.month}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-medium">KES {payslip.basicSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Allowances</span>
                    <span className="font-medium text-green-600">+KES {payslip.allowances.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium text-red-600">-KES {payslip.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pension</span>
                    <span className="font-medium text-red-600">-KES {payslip.pension.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Other Deductions</span>
                    <span className="font-medium text-red-600">-KES {(payslip.deductions - payslip.tax - payslip.pension).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Net Salary</span>
                      <span className="font-bold text-lg text-blue-600">KES {payslip.netSalary.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => handleDownload(payslip.id)}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>Salary Summary</CardTitle>
          <CardDescription>Annual salary overview</CardDescription>
        </CardHeader>
        <CardContent>
          {payslips.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Payslips</span>
                <span className="font-medium">{payslips.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Monthly Salary</span>
                <span className="font-medium">
                  KES {Math.round(payslips.reduce((sum, p) => sum + p.netSalary, 0) / payslips.length).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total YTD</span>
                <span className="font-medium">
                  KES {payslips.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No salary data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

