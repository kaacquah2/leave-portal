'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Search, Mail, Phone, Calendar, Briefcase, Building2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ManagerTeamViewProps {
  managerStaffId?: string
}

interface TeamMember {
  id: string
  staffId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  grade: string
  level: string
  active: boolean
  joinDate: string
  leaveBalance?: {
    annual: number
    sick: number
    unpaid: number
  }
  pendingLeaves?: number
  activeLeaves?: number
}

export default function ManagerTeamView({ managerStaffId }: ManagerTeamViewProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchTeamMembers()
  }, [managerStaffId])

  useEffect(() => {
    if (searchTerm) {
      const filtered = teamMembers.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.position.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(teamMembers)
    }
  }, [searchTerm, teamMembers])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      // Fetch manager's team members
      // In a real app, this would filter by department or team assignment
      const response = await fetch('/api/staff', {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch team members')
      
      const allStaff = await response.json()
      
      // Filter to show only active team members
      // In production, this would filter by manager's department/team
      const team = allStaff.filter((s: any) => s.active)
      
      // Fetch leave balances and pending leaves for each member
      const membersWithData = await Promise.all(
        team.map(async (member: any) => {
          try {
            const [balanceRes, leavesRes] = await Promise.all([
              fetch(`/api/balances/${member.staffId}`, { credentials: 'include' }),
              fetch(`/api/leaves?staffId=${member.staffId}`, { credentials: 'include' }),
            ])
            
            const balance = balanceRes.ok ? await balanceRes.json() : null
            const leaves = leavesRes.ok ? await leavesRes.json() : []
            
            return {
              ...member,
              leaveBalance: balance,
              pendingLeaves: leaves.filter((l: any) => l.status === 'pending').length,
              activeLeaves: leaves.filter((l: any) => l.status === 'approved').length,
            }
          } catch {
            return member
          }
        })
      )
      
      setTeamMembers(membersWithData)
      setFilteredMembers(membersWithData)
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Team</h1>
          <p className="text-muted-foreground mt-2">
            Manage and view your team members' information and leave status
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredMembers.length} Team Member{filteredMembers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by name, staff ID, department, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'No team members found' : 'No team members'}
              </p>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Team members will appear here once assigned'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {member.firstName} {member.lastName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {member.position}
                    </CardDescription>
                  </div>
                  <Badge variant={member.active ? 'default' : 'secondary'}>
                    {member.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Staff Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span>ID: {member.staffId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{member.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Grade: {member.grade} | Level: {member.level}</span>
                  </div>
                </div>

                {/* Leave Status */}
                {member.leaveBalance && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-semibold text-foreground">Leave Status</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Annual:</span>
                        <span className="ml-1 font-semibold">{member.leaveBalance.annual} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sick:</span>
                        <span className="ml-1 font-semibold">{member.leaveBalance.sick} days</span>
                      </div>
                    </div>
                    {(member.pendingLeaves !== undefined || member.activeLeaves !== undefined) && (
                      <div className="flex gap-2 mt-2">
                        {member.pendingLeaves !== undefined && member.pendingLeaves > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {member.pendingLeaves} Pending
                          </Badge>
                        )}
                        {member.activeLeaves !== undefined && member.activeLeaves > 0 && (
                          <Badge variant="default" className="text-xs">
                            {member.activeLeaves} Active
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // Navigate to leave approval for this team member
                      window.location.href = `/portal?tab=leave&staffId=${member.staffId}`
                    }}
                  >
                    View Leaves
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

