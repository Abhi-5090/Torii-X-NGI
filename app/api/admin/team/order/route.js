import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTeamCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Save the team order. JSON: { ids: [memberId, …] } in the new order (all members). */
export async function PUT(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const parsed = ids.map((raw) => { try { return new ObjectId(String(raw)); } catch { return null; } });
    if (!parsed.length || parsed.some((id) => !id) || new Set(ids.map(String)).size !== ids.length) {
        return NextResponse.json({ success: false, message: 'Invalid order.' }, { status: 400 });
    }
    try {
        const team = await getTeamCollection();
        const total = await team.countDocuments({});
        if (total !== parsed.length || (await team.countDocuments({ _id: { $in: parsed } })) !== total) {
            return NextResponse.json({ success: false, message: 'The team changed meanwhile. Please reload and try again.' }, { status: 409 });
        }
        const now = new Date();
        await team.bulkWrite(parsed.map((_id, order) => ({ updateOne: { filter: { _id }, update: { $set: { order, updatedAt: now } } } })));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin/team/order] failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the order.' }, { status: 503 });
    }
}
