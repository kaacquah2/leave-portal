// Note: jsPDF and ExcelJS should be imported dynamically to reduce bundle size
// This file contains utility functions for report generation

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
 * ExcelJS is lazy loaded to reduce initial bundle size (~500KB)
 */
export async function generateExcelReport(reportData: ReportData): Promise<Blob> {
  // Lazy load ExcelJS only when needed
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  // Create summary sheet if available
  if (reportData.summary) {
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ]
    
    Object.entries(reportData.summary).forEach(([key, value]) => {
      summarySheet.addRow({
        metric: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        value: value,
      })
    })
    
    // Style header row
    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
  }

  // Create main data sheet
  const dataSheet = workbook.addWorksheet('Data')
  
  // Set column headers
  dataSheet.columns = reportData.columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: 20,
  }))
  
  // Add data rows
  reportData.data.forEach((row) => {
    dataSheet.addRow(row)
  })
  
  // Style header row
  dataSheet.getRow(1).font = { bold: true }
  dataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Generate buffer and return as blob
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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

