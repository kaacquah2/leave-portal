'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Building2, CreditCard, Save, Edit } from 'lucide-react'

interface BankAccount {
  bankName: string
  accountNumber: string
  accountName: string
  branch?: string
  accountType: string
  swiftCode?: string
  updatedAt?: string
}

export default function EmployeeBankAccount() {
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<BankAccount>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    branch: '',
    accountType: 'Savings',
    swiftCode: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchBankAccount()
  }, [])

  const fetchBankAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee/bank-account', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setBankAccount(data)
          setFormData(data)
        }
      }
    } catch (error) {
      console.error('Error fetching bank account:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/employee/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        setBankAccount(result.bankAccount)
        setIsEditing(false)
        toast({
          title: 'Success',
          description: 'Bank account information updated successfully',
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save bank account')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save bank account',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading bank account information...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Account Details</h1>
          <p className="text-muted-foreground mt-1">Manage your bank account information for payroll</p>
        </div>
        {!isEditing && bankAccount && (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        )}
      </div>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Information
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update your bank account details'
              : 'Your bank account information for salary payments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing || !bankAccount ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    required
                    placeholder="e.g., GCB Bank, Ecobank"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    required
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Account Name *</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    required
                    placeholder="Name on account"
                  />
                </div>
                <div>
                  <Label htmlFor="accountType">Account Type *</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value) => setFormData({ ...formData, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                      <SelectItem value="Fixed Deposit">Fixed Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="Branch name"
                  />
                </div>
                <div>
                  <Label htmlFor="swiftCode">SWIFT Code</Label>
                  <Input
                    id="swiftCode"
                    value={formData.swiftCode}
                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                    placeholder="Bank SWIFT code"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
                {bankAccount && (
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false)
                    setFormData(bankAccount)
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Bank Name</Label>
                  <p className="font-medium">{bankAccount.bankName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Number</Label>
                  <p className="font-medium font-mono">{bankAccount.accountNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Name</Label>
                  <p className="font-medium">{bankAccount.accountName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Type</Label>
                  <p className="font-medium">{bankAccount.accountType}</p>
                </div>
                {bankAccount.branch && (
                  <div>
                    <Label className="text-muted-foreground">Branch</Label>
                    <p className="font-medium">{bankAccount.branch}</p>
                  </div>
                )}
                {bankAccount.swiftCode && (
                  <div>
                    <Label className="text-muted-foreground">SWIFT Code</Label>
                    <p className="font-medium font-mono">{bankAccount.swiftCode}</p>
                  </div>
                )}
              </div>
              {bankAccount.updatedAt && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(bankAccount.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

