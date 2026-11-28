import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTeamPhotosCollection } from '../../../../../lib/mongodb';

// Public — serves an uploaded team photo. Each upload gets a new id, so the
// bytes behind a URL never change and can be cached forever.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
    let id;
    try { id = new ObjectId(params.id); } catch { return new NextResponse('Not found', { status: 404 }); }
    try {
        const photos = await getTeamPhotosCollection();
        const doc = await photos.findOne({ _id: id }, { projection: { data: 1, contentType: 1 } });
        if (!doc?.data) return new NextResponse('Not found', { status: 404 });
        return new NextResponse(doc.data.buffer ?? doc.data, {
            status: 200,
            headers: { 'Content-Type': doc.contentType || 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
        });
    } catch (error) {
        console.error('[team/photo] failed:', error);
        return new NextResponse('Server error', { status: 500 });
    }
}
