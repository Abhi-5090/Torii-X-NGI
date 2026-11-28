import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTeamPortfolioPartsCollection } from '../../../../../../lib/mongodb';

// Public — one part of a large uploaded portfolio (see ../route.js). Parts never change.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
    let id;
    try { id = new ObjectId(params.id); } catch { return new NextResponse('Not found', { status: 404 }); }
    const n = Number(params.part);
    if (!Number.isInteger(n) || n < 0) return new NextResponse('Not found', { status: 404 });
    try {
        const parts = await getTeamPortfolioPartsCollection();
        const part = await parts.findOne({ fileId: id, n }, { projection: { data: 1 } });
        if (!part?.data) return new NextResponse('Not found', { status: 404 });
        return new NextResponse(part.data.buffer ?? part.data, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
                // The sandboxed loader page (../route.js) has an opaque origin, so
                // its fetch of each part is cross-origin. Parts are public anyway.
                'Access-Control-Allow-Origin': '*',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('[team/portfolio/part] failed:', error);
        return new NextResponse('Server error', { status: 500 });
    }
}
