import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

const createImportSchema = z.object({
  url: z.string().url('Valid URL required'),
  type: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const jobs = await db.importJob.findMany({
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Import jobs GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const userId = (session.user as Record<string, unknown>).userId as string

    // Create import job
    const job = await db.importJob.create({
      data: {
        createdById: userId,
        type: parsed.data.type || 'url',
        status: 'running',
        sourceInput: JSON.stringify({ url: parsed.data.url }),
        config: parsed.data.config ? JSON.stringify(parsed.data.config) : '{}',
      },
    })

    // Process import asynchronously (fire and forget)
    processImport(job.id, parsed.data.url, userId).catch((err) => {
      console.error('Import processing error:', err)
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    console.error('Import POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

async function processImport(jobId: string, url: string, userId: string) {
  const startTime = Date.now()

  try {
    // Create initial import item for the URL
    const importItem = await db.importItem.create({
      data: {
        jobId,
        url,
        status: 'extracting',
      },
    })

    // Fetch the page content
    let html = ''
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShopNova/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (response.ok) {
        html = await response.text()
      }
    } catch {
      // Fetch failed
    }

    await db.importItem.update({
      where: { id: importItem.id },
      data: {
        rawHtmlLength: html.length,
        status: html.length > 100 ? 'preview' : 'failed',
        extractionMethod: 'fetch + llm',
        errorMessage: html.length <= 100 ? 'Could not fetch page content' : undefined,
      },
    })

    if (html.length <= 100) {
      await db.importJob.update({
        where: { id: jobId },
        data: { status: 'failed', completedAt: new Date(), errorMessage: 'Could not fetch page content' },
      })
      return
    }

    // Use LLM to extract product data from HTML
    const zai = new ZAI()
    const llmResponse = await zai.createChatCompletion({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system' as const,
          content: `You are an e-commerce product data extractor. Analyze the following HTML content and extract product information.
Return a JSON object with these fields:
{
  "products": [
    {
      "title": "Product name",
      "description": "Product description",
      "price": 0.00,
      "compareAtPrice": 0.00 or null,
      "currency": "BDT",
      "images": ["url1", "url2"],
      "brand": "Brand name or null",
      "category": "Category name or null",
      "specifications": {"key": "value"},
      "tags": ["tag1", "tag2"]
    }
  ]
}

Only return valid JSON. If no products found, return {"products": []}.`,
        },
        {
          role: 'user' as const,
          content: html.substring(0, 15000),
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    })

    let extractedData: { products: Array<Record<string, unknown>> }
    try {
      const content = llmResponse?.choices?.[0]?.message?.content || llmResponse?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { products: [] }
    } catch {
      extractedData = { products: [] }
    }

    const products = extractedData.products || []
    const duration = Date.now() - startTime

    // Create individual import items for each product (skip the first placeholder item)
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      await db.importItem.create({
        data: {
          jobId,
          url,
          status: 'preview',
          extracted: JSON.stringify(product),
          extractionMethod: 'fetch + llm',
          confidence: 0.8,
        },
      })
    }

    // Update the placeholder item
    await db.importItem.update({
      where: { id: importItem.id },
      data: {
        extracted: JSON.stringify(extractedData),
        confidence: products.length > 0 ? 0.8 : 0.1,
        durationMs: duration,
        status: products.length > 0 ? 'imported' : 'failed',
        errorMessage: products.length === 0 ? 'No products found on page' : undefined,
      },
    })

    // Mark job as completed
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progressTotal: products.length,
        progressDone: products.length,
        resultSummary: JSON.stringify({
          productsFound: products.length,
          url,
          durationMs: duration,
        }),
      },
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: errMsg,
      },
    })
  }
}
