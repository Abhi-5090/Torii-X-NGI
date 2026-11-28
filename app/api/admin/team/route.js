import { NextResponse } from 'next/server';
import { getTeamCollection, getTeamPhotosCollection } from '../../../../lib/mongodb';
import { isAuthenticated } from '../../../../lib/dashboard-auth';
import { validateMember } from '../../../../lib/team-schema';
import { seedBuiltInTeam, resolveTeamPhoto, resolvePortfolio, attachPortfolio, toAdminMember } from '../../../../lib/team-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const unauthorized = () => NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

/** Every team member in site order. Copies any built-in member not yet in the
 *  database, so the whole team is editable. */
export async function GET(request) {
    if (!isAuthenticated(request)) return unauthorized();
    try {
        await seedBuiltInTeam();
        const team = await getTeamCollection();
        const docs = await team.find({}).sort({ order: 1, createdAt: 1 }).toArray();
        return NextResponse.json({ success: true, members: docs.map(toAdminMember) });
    } catch (error) {
        console.error('[admin/team] list failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load the team.' }, { status: 500 });
    }
}

/** Add a member (placed at the end of the team). JSON body: the member fields
 *  plus `photo` ({ imageId } from POST /api/admin/team/photo). */
export async function POST(request) {
    if (!isAuthenticated(request)) return unauthorized();

    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
    }

    const { ok, errors, value } = validateMember(body, Boolean(body.photo));
    if (!ok) return NextResponse.json({ success: false, message: 'Please correct the highlighted fields.', errors }, { status: 422 });

    try {
        const resolved = await resolveTeamPhoto(body.photo, null);
        if (resolved.error) {
            return NextResponse.json({ success: false, message: resolved.error, errors: { photo: resolved.error } }, { status: 422 });
        }
        const pf = await resolvePortfolio(value.portfolio, null);
        if (pf.error) {
            return NextResponse.json({ success: false, message: pf.error, errors: { portfolio: pf.error } }, { status: 422 });
        }
        const team = await getTeamCollection();
        const last = await team.find({}, { projection: { order: 1 } }).sort({ order: -1 }).limit(1).toArray();
        const now = new Date();
        const result = await team.insertOne({
            ...value,
            source: 'admin',
            photo: resolved.photo,
            portfolioFile: pf.portfolioFile,
            order: (last[0]?.order ?? -1) + 1,
            published: true,
            createdAt: now,
            updatedAt: now,
        });
        if (resolved.uploadedId) {
            const photos = await getTeamPhotosCollection();
            await photos.updateOne({ _id: resolved.uploadedId }, { $set: { memberId: result.insertedId } });
        }
        if (pf.uploadedId) await attachPortfolio(result.insertedId, pf.uploadedId);
        return NextResponse.json({ success: true, message: 'Member added.', id: String(result.insertedId) }, { status: 201 });
    } catch (error) {
        console.error('[admin/team] create failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the member. Please try again.' }, { status: 503 });
    }
}
