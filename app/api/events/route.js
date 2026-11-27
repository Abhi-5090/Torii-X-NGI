import { NextResponse } from 'next/server';
import { getEventsCollection } from '../../../lib/mongodb';
import { getSeededBuiltinIds, toPublicEvent } from '../../../lib/events-store';

// Public — the Events section loads this. `builtinIds` lists the built-in events
// (events-data.js) that now live in the database: for those the database copy
// (possibly edited, hidden or deleted in the admin) wins over the built-in file.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const [builtinIds, events] = await Promise.all([getSeededBuiltinIds(), getEventsCollection()]);
        const docs = await events.find({ published: { $ne: false } }).sort({ date: -1, createdAt: -1 }).toArray();
        return NextResponse.json(
            { success: true, builtinIds, events: docs.map(toPublicEvent) },
            // Short shared cache: admin changes show up within about a minute
            // without every visitor hitting the database.
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        );
    } catch (error) {
        console.error('[events] list failed:', error);
        // Fail soft: the website keeps showing its built-in events.
        return NextResponse.json({ success: false, builtinIds: [], events: [] });
    }
}
