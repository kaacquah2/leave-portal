// Note: jsPDF should be imported dynamically in client components
// This file contains utility functions for report generation
import * as XLSX from 'xlsx'

export interface ReportData {
  title: string
  period?: string
  generatedAt: string
  data: any[]
  columns: { key: string; label: string }[]
  summary?: Record<string, any>
}

/**
 * Generate PDF report (client-side only)
 * Note: This function should be called from a client component
 * with jsPDF imported dynamically
 */
export async function generatePDFReport(reportData: ReportData): Promise<Blob> {
  // Dynamic import for client-side only
  const jsPDF = (await import('jspdf')).default
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const lineHeight = 7
  let yPosition = margin

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(reportData.title, margin, yPosition)
  yPosition += lineHeight * 2

  // Period and date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (reportData.period) {
    doc.text(`Period: ${reportData.period}`, margin, yPosition)
    yPosition += lineHeight
  }
  doc.text(`Generated: ${reportData.generatedAt}`, margin, yPosition)
  yPosition += lineHeight * 1.5

  // Summary if available
  if (reportData.summary) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Summary', margin, yPosition)
    yPosition += lineHeight
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      doc.text(`${label}: ${value}`, margin + 10, yPosition)
      yPosition += lineHeight
    })
    yPosition += lineHeight
  }

  // Table headers
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const colWidths = reportData.columns.map(() => (pageWidth - 2 * margin) / reportData.columns.length)
  let xPosition = margin

  reportData.columns.forEach((col, index) => {
    doc.text(col.label, xPosition, yPosition)
    xPosition += colWidths[index]
  })
  yPosition += lineHeight

  // Draw line under headers
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2)
  yPosition += lineHeight * 0.5

  // Table data
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  reportData.data.forEach((row) => {
    if (yPosition > pageHeight - margin - lineHeight) {
      doc.addPage()
      yPosition = margin
    }

    xPosition = margin
    reportData.columns.forEach((col, index) => {
      const value = row[col.key]?.toString() || ''
      doc.text(value.substring(0, 30), xPosition, yPosition)
      xPosition += colWidths[index]
    })
    yPosition += lineHeight
  })

  return doc.output('blob')
}

/**
 * Generate Excel report
 */
export function generateExcelReport(reportData: ReportData): Blob {
  const workbook = XLSX.utils.book_new()

  // Create summary sheet if available
  if (reportData.summary) {
    const summaryData = Object.entries(reportData.summary).map(([key, value]) => ({
      Metric: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      Value: value,
    }))
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  }

  // Create main data sheet
  const worksheetData = reportData.data.map((row) => {
    const obj: Record<string, any> = {}
    reportData.columns.forEach((col) => {
      obj[col.label] = row[col.key]
    })
    return obj
  })
  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

  // Generate blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * Download file helper
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

