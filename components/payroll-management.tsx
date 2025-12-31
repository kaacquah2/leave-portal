'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Download,
  Calculator,
  FileText
} from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { toast } from 'sonner'

interface SalaryStructure {
  id: string
  staffId: string
  basicSalary: number
  allowances: any
  deductions: any
  effectiveDate: string
  endDate?: string
  approvedBy: string
  notes?: string
}

interface PayrollItem {
  id: string
  payrollId: string
  staffId: string
  basicSalary: number
  allowances: number
  grossSalary: number
  taxDeduction: number
  pensionDeduction: number
  otherDeductions: number
  netSalary: number
  status: string
}

interface Payroll {
  id: string
  period: string
  month: number
  year: number
  totalStaff: number
  totalAmount: number
  status: string
  processedBy?: string
  processedAt?: string
  approvedBy?: string
  approvedAt?: string
}

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState('salary-structures')
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([])
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPayroll, setProcessingPayroll] = useState(false)
  const [payPeriod, setPayPeriod] = useState('')
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)

  const fetchSalaryStructures = async () => {
    try {
      const response = await apiRequest('/api/payroll/salary-structure')
      if (response.ok) {
        const data = await response.json()
        setSalaryStructures(data)
      }
    } catch (err: any) {
      console.error('Failed to fetch salary structures:', err)
    }
  }

  const fetchPayrolls = async () => {
    try {
      const response = await apiRequest('/api/payroll/process')
      if (response.ok) {
        const data = await response.json()
        setPayrolls(data.payrolls || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch payrolls:', err)
    }
  }

  const fetchPayrollItems = async (payrollId: string) => {
    try {
      const response = await apiRequest(`/api/payroll/${payrollId}/items`)
      if (response.ok) {
        const data = await response.json()
        setPayrollItems(data.items || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch payroll items:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchSalaryStructures(), fetchPayrolls()])
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPayroll) {
      fetchPayrollItems(selectedPayroll.id)
    }
  }, [selectedPayroll])

  const handleProcessPayroll = async () => {
    if (!payPeriod || !payPeriod.match(/^\d{4}-\d{2}$/)) {
      toast.error('Please enter a valid pay period (YYYY-MM)')
      return
    }

    try {
      setProcessingPayroll(true)
      const response = await apiRequest('/api/payroll/process', {
        method: 'POST',
        body: JSON.stringify({
          payPeriod,
          processAll: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process payroll')
      }

      const data = await response.json()
      toast.success(`Payroll processed successfully. ${data.processed} staff processed.`)
      setPayPeriod('')
      fetchPayrolls()
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payroll')
    } finally {
      setProcessingPayroll(false)
    }
  }

  const handleApprovePayroll = async (payrollId: string) => {
    try {
      const response = await apiRequest(`/api/payroll/${payrollId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve payroll')
      }

      toast.success('Payroll approved successfully')
      fetchPayrolls()
      if (selectedPayroll?.id === payrollId) {
        setSelectedPayroll(null)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve payroll')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-800"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading payroll data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-primary" />
            Payroll Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Process payroll with GRA tax calculation and CAGD compliance
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          fetchSalaryStructures()
          fetchPayrolls()
        }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="salary-structures">Salary Structures</TabsTrigger>
          <TabsTrigger value="process-payroll">Process Payroll</TabsTrigger>
          <TabsTrigger value="payroll-history">Payroll History</TabsTrigger>
        </TabsList>

        <TabsContent value="salary-structures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Structures</CardTitle>
              <CardDescription>
                Manage staff salary structures (PSC compliant)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salaryStructures.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No salary structures found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {salaryStructures.map((structure) => (
                    <div key={structure.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Staff ID: {structure.staffId}</h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Basic Salary:</span>
                              <div className="font-semibold">₵{structure.basicSalary.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Effective Date:</span>
                              <div className="font-semibold">
                                {new Date(structure.effectiveDate).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Allowances:</span>
                              <div className="font-semibold">
                                {structure.allowances ? Object.keys(structure.allowances).length : 0} types
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <div className="font-semibold">
                                {structure.endDate ? 'Inactive' : 'Active'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process-payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Payroll</CardTitle>
              <CardDescription>
                Process payroll for all active staff (GRA tax calculation included)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="payPeriod">Pay Period (YYYY-MM) *</Label>
                  <Input
                    id="payPeriod"
                    type="text"
                    placeholder="2024-12"
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                    pattern="\d{4}-\d{2}"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleProcessPayroll}
                    disabled={processingPayroll || !payPeriod}
                  >
                    {processingPayroll ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4 mr-2" />
                        Process Payroll
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Payroll processing includes automatic GRA tax calculation and pension deductions.
                Processing requires HR Director approval.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>
                View processed payroll records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payrolls.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No payroll records found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payrolls.map((payroll) => (
                    <div
                      key={payroll.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedPayroll(payroll)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Period: {payroll.period}</h3>
                            {getStatusBadge(payroll.status)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Staff Count:</span>
                              <div className="font-semibold">{payroll.totalStaff}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Amount:</span>
                              <div className="font-semibold">₵{payroll.totalAmount.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Processed:</span>
                              <div className="font-semibold">
                                {payroll.processedAt
                                  ? new Date(payroll.processedAt).toLocaleDateString()
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Approved:</span>
                              <div className="font-semibold">
                                {payroll.approvedAt
                                  ? new Date(payroll.approvedAt).toLocaleDateString()
                                  : 'Pending'}
                              </div>
                            </div>
                          </div>
                        </div>
                        {payroll.status === 'processing' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprovePayroll(payroll.id)
                            }}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPayroll && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Payroll Items - {selectedPayroll.period}</CardTitle>
                    <CardDescription>
                      Individual staff payroll records
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {payrollItems.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No payroll items found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium">Staff ID</th>
                              <th className="text-left p-3 font-medium">Basic</th>
                              <th className="text-left p-3 font-medium">Allowances</th>
                              <th className="text-left p-3 font-medium">Gross</th>
                              <th className="text-left p-3 font-medium">Tax</th>
                              <th className="text-left p-3 font-medium">Pension</th>
                              <th className="text-left p-3 font-medium">Net</th>
                              <th className="text-left p-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payrollItems.map((item) => (
                              <tr key={item.id} className="border-b">
                                <td className="p-3 text-sm">{item.staffId}</td>
                                <td className="p-3 text-sm">₵{item.basicSalary.toLocaleString()}</td>
                                <td className="p-3 text-sm">₵{item.allowances.toLocaleString()}</td>
                                <td className="p-3 text-sm font-semibold">₵{item.grossSalary.toLocaleString()}</td>
                                <td className="p-3 text-sm">₵{item.taxDeduction.toLocaleString()}</td>
                                <td className="p-3 text-sm">₵{item.pensionDeduction.toLocaleString()}</td>
                                <td className="p-3 text-sm font-semibold text-green-600">
                                  ₵{item.netSalary.toLocaleString()}
                                </td>
                                <td className="p-3">
                                  {getStatusBadge(item.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

