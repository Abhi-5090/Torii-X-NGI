import { NextResponse } from 'next/server';
import { getTeamCollection } from '../../../lib/mongodb';
import { getSeededTeamIds, toPublicMember } from '../../../lib/team-store';

// Public — the Meet the Team section loads this. `builtinIds` lists the
// built-in members (team-data.js) that now live in the database; for those the
// database copy (possibly edited, reordered, hidden or deleted) wins.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const [builtinIds, team] = await Promise.all([getSeededTeamIds(), getTeamCollection()]);
        const docs = await team.find({ published: { $ne: false } }).sort({ order: 1, createdAt: 1 }).toArray();
        return NextResponse.json(
            { success: true, builtinIds, members: docs.map(toPublicMember) },
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        );
    } catch (error) {
        console.error('[team] list failed:', error);
        return NextResponse.json({ success: false, builtinIds: [], members: [] });
    }
}
