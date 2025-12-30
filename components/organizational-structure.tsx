/**
 * MoFA Organizational Structure Component
 * Displays the complete organizational hierarchy with units, directorates, and reporting lines
 */

'use client'

import { useState } from 'react'
import { Building2, Users, ChevronRight, ChevronDown, MapPin, Briefcase } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MOFA_UNITS } from '@/lib/mofa-unit-mapping'

interface OrganizationalStructureProps {
  userRole?: string
  userUnit?: string
  userDirectorate?: string
}

export default function OrganizationalStructure({ 
  userRole, 
  userUnit, 
  userDirectorate 
}: OrganizationalStructureProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['minister', 'chief-director', 'finance-admin', 'ppme']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Group units by directorate
  const unitsByDirectorate = MOFA_UNITS.reduce((acc, unit) => {
    const key = unit.directorate || 'Chief Director'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(unit)
    return acc
  }, {} as Record<string, typeof MOFA_UNITS>)

  // Office of the Minister units
  const ministerUnits = MOFA_UNITS.filter(u => 
    ['Ministerial Secretariat', 'Protocol Unit', 'Public Affairs / Communications Unit'].includes(u.unit)
  )

  // Office of the Chief Director units
  const chiefDirectorUnits = MOFA_UNITS.filter(u => 
    u.directorate === null && 
    !['Ministerial Secretariat', 'Protocol Unit', 'Public Affairs / Communications Unit'].includes(u.unit)
  )

  // Finance & Administration units
  const financeAdminUnits = unitsByDirectorate['Finance & Administration Directorate'] || []

  // PPME Directorate units
  const ppmeUnits = unitsByDirectorate['Policy, Planning, Monitoring & Evaluation (PPME) Directorate'] || []

  const isUserUnit = (unit: string) => userUnit && unit.toLowerCase().includes(userUnit.toLowerCase())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">MoFA Organizational Structure</h2>
          <p className="text-muted-foreground mt-1">
            Ministry of Fisheries and Aquaculture - Complete Hierarchy
          </p>
        </div>
        {userUnit && (
          <Badge variant="outline" className="text-sm">
            <MapPin className="w-3 h-3 mr-1" />
            Your Unit: {userUnit}
          </Badge>
        )}
      </div>

      {/* Office of the Minister */}
      <Card className="border-l-4 border-l-blue-600">
        <Collapsible open={expandedSections.has('minister')} onOpenChange={() => toggleSection('minister')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedSections.has('minister') ? (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-primary" />
                  )}
                  <Building2 className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Office of the Minister</CardTitle>
                    <CardDescription>Political Head - Administrative oversight by Chief Director</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{ministerUnits.length} Units</Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {ministerUnits.map((unit) => (
                  <div
                    key={unit.unit}
                    className={`p-4 rounded-lg border ${
                      isUserUnit(unit.unit)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{unit.unit}</span>
                        {isUserUnit(unit.unit) && (
                          <Badge variant="default" className="ml-2">Your Unit</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Reports to: Chief Director
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Office of the Chief Director */}
      <Card className="border-l-4 border-l-purple-600">
        <Collapsible open={expandedSections.has('chief-director')} onOpenChange={() => toggleSection('chief-director')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedSections.has('chief-director') ? (
                    <ChevronDown className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-600" />
                  )}
                  <Users className="w-6 h-6 text-purple-600" />
                  <div>
                    <CardTitle>Office of the Chief Director</CardTitle>
                    <CardDescription>Administrative Head & Accounting Officer</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{chiefDirectorUnits.length} Units</Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {chiefDirectorUnits.map((unit) => (
                  <div
                    key={unit.unit}
                    className={`p-4 rounded-lg border ${
                      isUserUnit(unit.unit)
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{unit.unit}</span>
                        {isUserUnit(unit.unit) && (
                          <Badge variant="default" className="ml-2">Your Unit</Badge>
                        )}
                        {unit.specialWorkflow === 'AUDIT' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Audit Role
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Reports to: Chief Director
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Finance & Administration Directorate */}
      <Card className="border-l-4 border-l-green-600">
        <Collapsible open={expandedSections.has('finance-admin')} onOpenChange={() => toggleSection('finance-admin')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedSections.has('finance-admin') ? (
                    <ChevronDown className="w-5 h-5 text-green-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-green-600" />
                  )}
                  <Building2 className="w-6 h-6 text-green-600" />
                  <div>
                    <CardTitle>Finance & Administration Directorate</CardTitle>
                    <CardDescription>Director: Finance & Administration</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{financeAdminUnits.length} Units</Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {financeAdminUnits.map((unit) => (
                  <div
                    key={unit.unit}
                    className={`p-4 rounded-lg border ${
                      isUserUnit(unit.unit)
                        ? 'bg-green-50 border-green-500'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{unit.unit}</span>
                        {isUserUnit(unit.unit) && (
                          <Badge variant="default" className="ml-2">Your Unit</Badge>
                        )}
                        {unit.specialWorkflow === 'HRMU' && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Special Workflow
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Reports to: Director, F&A
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* PPME Directorate */}
      <Card className="border-l-4 border-l-orange-600">
        <Collapsible open={expandedSections.has('ppme')} onOpenChange={() => toggleSection('ppme')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedSections.has('ppme') ? (
                    <ChevronDown className="w-5 h-5 text-orange-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-orange-600" />
                  )}
                  <Building2 className="w-6 h-6 text-orange-600" />
                  <div>
                    <CardTitle>Policy, Planning, Monitoring & Evaluation (PPME) Directorate</CardTitle>
                    <CardDescription>Director: PPME</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{ppmeUnits.length} Units</Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {ppmeUnits.map((unit) => (
                  <div
                    key={unit.unit}
                    className={`p-4 rounded-lg border ${
                      isUserUnit(unit.unit)
                        ? 'bg-orange-50 border-orange-500'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{unit.unit}</span>
                        {isUserUnit(unit.unit) && (
                          <Badge variant="default" className="ml-2">Your Unit</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Reports to: Director, PPME
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Organizational Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{ministerUnits.length}</div>
              <div className="text-sm text-muted-foreground">Minister Units</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{chiefDirectorUnits.length}</div>
              <div className="text-sm text-muted-foreground">Chief Director Units</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{financeAdminUnits.length}</div>
              <div className="text-sm text-muted-foreground">Finance & Admin Units</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{ppmeUnits.length}</div>
              <div className="text-sm text-muted-foreground">PPME Units</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{MOFA_UNITS.length}</div>
              <div className="text-sm text-muted-foreground">Total Units</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

