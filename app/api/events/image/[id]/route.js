import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getEventImagesCollection } from '../../../../../lib/mongodb';

// Public — serves an admin-added event photo. Photos are never edited in place
// (each upload gets a new id), so responses can be cached forever.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
    let id;
    try { id = new ObjectId(params.id); } catch { return new NextResponse('Not found', { status: 404 }); }

    try {
        const images = await getEventImagesCollection();
        const doc = await images.findOne({ _id: id }, { projection: { data: 1, contentType: 1 } });
        if (!doc?.data) return new NextResponse('Not found', { status: 404 });
        return new NextResponse(doc.data.buffer ?? doc.data, {
            status: 200,
            headers: {
                'Content-Type': doc.contentType || 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('[events/image] failed:', error);
        return new NextResponse('Server error', { status: 500 });
    }
}
