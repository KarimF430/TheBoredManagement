import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const linkId = url.searchParams.get('lid')
    const conversionType = url.searchParams.get('type') || 'purchase'
    const value = parseFloat(url.searchParams.get('value') || '0')
    const orderId = url.searchParams.get('order') || null

    if (!linkId) {
      return new NextResponse(PIXEL_GIF, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' },
      })
    }

    const client = getCPClient()

    await client.from('cp_link_conversions').insert({
      link_id: linkId,
      conversion_type: conversionType,
      value: value || null,
      order_id: orderId,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || '',
      referer: req.headers.get('referer') || '',
      created_at: new Date().toISOString(),
    })

    // Manual increment fallback
    const { data: link } = await client
      .from('cp_tracked_links')
      .select('conversions')
      .eq('id', linkId)
      .single()

    if (link) {
      await client
        .from('cp_tracked_links')
        .update({ conversions: (link.conversions || 0) + 1 })
        .eq('id', linkId)
    }

    return new NextResponse(PIXEL_GIF, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' },
    })
  } catch {
    return new NextResponse(PIXEL_GIF, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { link_id, conversion_type, value, order_id } = body

    if (!link_id) {
      return NextResponse.json({ error: 'link_id is required' }, { status: 400 })
    }

    const client = getCPClient()

    await client.from('cp_link_conversions').insert({
      link_id,
      conversion_type: conversion_type || 'purchase',
      value: value || null,
      order_id: order_id || null,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || '',
      referer: req.headers.get('referer') || '',
      created_at: new Date().toISOString(),
    })

    const { data: link } = await client
      .from('cp_tracked_links')
      .select('conversions')
      .eq('id', link_id)
      .single()

    if (link) {
      await client
        .from('cp_tracked_links')
        .update({ conversions: (link.conversions || 0) + 1 })
        .eq('id', link_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
