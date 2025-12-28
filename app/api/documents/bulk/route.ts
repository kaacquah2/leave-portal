import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// POST bulk operations on documents
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can perform bulk operations
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { operation, documentIds, data } = body

      if (!operation || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return NextResponse.json(
          { error: 'Operation and documentIds array are required' },
          { status: 400 }
        )
      }

      let result: any = { success: true, processed: 0, failed: 0 }

      switch (operation) {
        case 'delete':
          // Bulk delete
          const deleteResult = await prisma.document.deleteMany({
            where: {
              id: { in: documentIds },
            },
          })
          result.processed = deleteResult.count
          break

        case 'archive':
          // Bulk archive
          const archiveResult = await prisma.document.updateMany({
            where: {
              id: { in: documentIds },
            },
            data: {
              status: 'archived' as any,
            },
          })
          result.processed = archiveResult.count
          break

        case 'update':
          // Bulk update (update tags, category, etc.)
          if (!data) {
            return NextResponse.json(
              { error: 'Update data is required' },
              { status: 400 }
            )
          }

          const updateData: any = {}
          if (data.tags !== undefined) updateData.tags = data.tags
          if (data.category !== undefined) updateData.category = data.category
          if (data.type !== undefined) updateData.type = data.type
          if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
          if (data.status !== undefined) updateData.status = data.status

          // Rebuild search text if relevant fields changed
          if (data.name || data.description || data.tags || data.category || data.type) {
            // This would need to be done per document, so we'll update individually
            const documents = await prisma.document.findMany({
              where: { id: { in: documentIds } },
              select: { id: true, name: true, description: true, tags: true, category: true, type: true } as any,
            })

            for (const doc of documents) {
              const docTyped = doc as unknown as { id: string; name: string; description: string | null; tags: string[]; category: string; type: string }
              const searchText = [
                data.name || docTyped.name,
                data.description || docTyped.description,
                ...(data.tags || docTyped.tags || []),
                data.category || docTyped.category,
                data.type || docTyped.type,
              ].filter(Boolean).join(' ').toLowerCase()

              await prisma.document.update({
                where: { id: docTyped.id },
                data: {
                  ...updateData,
                  searchText,
                },
              })
            }
            result.processed = documents.length
          } else {
            const updateResult = await prisma.document.updateMany({
              where: {
                id: { in: documentIds },
              },
              data: updateData,
            })
            result.processed = updateResult.count
          }
          break

        case 'addTags':
          // Add tags to multiple documents
          if (!data || !data.tags || !Array.isArray(data.tags)) {
            return NextResponse.json(
              { error: 'Tags array is required' },
              { status: 400 }
            )
          }

          const documents = await prisma.document.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, tags: true, name: true, description: true, category: true, type: true } as any,
          })

          for (const doc of documents) {
            const docTyped = doc as unknown as { id: string; name: string; description: string | null; tags: string[]; category: string; type: string }
            const existingTags = docTyped.tags || []
            const newTags = [...new Set([...existingTags, ...data.tags])] // Remove duplicates
            
            const searchText = [
              docTyped.name,
              docTyped.description,
              ...newTags,
              docTyped.category,
              docTyped.type,
            ].filter(Boolean).join(' ').toLowerCase()

            await prisma.document.update({
              where: { id: docTyped.id },
              data: {
                tags: newTags as any,
                searchText,
              },
            })
          }
          result.processed = documents.length
          break

        case 'removeTags':
          // Remove tags from multiple documents
          if (!data || !data.tags || !Array.isArray(data.tags)) {
            return NextResponse.json(
              { error: 'Tags array is required' },
              { status: 400 }
            )
          }

          const docsToUpdate = await prisma.document.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, tags: true, name: true, description: true, category: true, type: true } as any,
          })

          for (const doc of docsToUpdate) {
            const docTyped = doc as unknown as { id: string; name: string; description: string | null; tags: string[]; category: string; type: string }
            const existingTags: string[] = docTyped.tags || []
            const newTags = existingTags.filter((tag: string) => !data.tags.includes(tag))
            
            const searchText = [
              docTyped.name,
              docTyped.description,
              ...newTags,
              docTyped.category,
              docTyped.type,
            ].filter(Boolean).join(' ').toLowerCase()

            await prisma.document.update({
              where: { id: docTyped.id },
              data: {
                tags: newTags as any,
                searchText,
              },
            })
          }
          result.processed = docsToUpdate.length
          break

        default:
          return NextResponse.json(
            { error: 'Invalid operation. Supported: delete, archive, update, addTags, removeTags' },
            { status: 400 }
          )
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: `DOCUMENT_BULK_${operation.toUpperCase()}`,
          user: user.email,
          details: `Bulk ${operation} performed on ${result.processed} documents`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error performing bulk operation:', error)
      return NextResponse.json(
        { error: 'Failed to perform bulk operation' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

