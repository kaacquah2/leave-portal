import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * Favicon route handler
 * Serves the icon-192x192.png as favicon.ico to fix 404 errors
 */
export async function GET(request: NextRequest) {
  try {
    const iconPath = path.join(process.cwd(), 'public', 'icon-192x192.png')
    
    if (!fs.existsSync(iconPath)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const iconBuffer = fs.readFileSync(iconPath)
    
    return new NextResponse(iconBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving favicon:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

