import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTeamCollection, getTeamPhotosCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { validateMember } from '../../../../../lib/team-schema';
import { resolveTeamPhoto, resolvePortfolio, attachPortfolio, deletePortfolios } from '../../../../../lib/team-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const parseId = (raw) => { try { return new ObjectId(raw); } catch { return null; } };
const unauthorized = () => NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
const badId = () => NextResponse.json({ success: false, message: 'Invalid member id.' }, { status: 400 });

/** Edit a member (built-in or added). Same body as adding one. */
export async function PUT(request, { params }) {
    if (!isAuthenticated(request)) return unauthorized();
    const id = parseId(params.id);
    if (!id) return badId();

    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
    }
    const { ok, errors, value } = validateMember(body, Boolean(body.photo));
    if (!ok) return NextResponse.json({ success: false, message: 'Please correct the highlighted fields.', errors }, { status: 422 });

    try {
        const team = await getTeamCollection();
        if (!(await team.findOne({ _id: id }, { projection: { _id: 1 } }))) {
            return NextResponse.json({ success: false, message: 'Member not found.' }, { status: 404 });
        }
        const resolved = await resolveTeamPhoto(body.photo, id);
        if (resolved.error) {
            return NextResponse.json({ success: false, message: resolved.error, errors: { photo: resolved.error } }, { status: 422 });
        }
        const pf = await resolvePortfolio(value.portfolio, id);
        if (pf.error) {
            return NextResponse.json({ success: false, message: pf.error, errors: { portfolio: pf.error } }, { status: 422 });
        }
        await team.updateOne({ _id: id }, { $set: { ...value, photo: resolved.photo, portfolioFile: pf.portfolioFile, updatedAt: new Date() } });
        await attachPortfolio(id, pf.uploadedId);

        // Attach a newly uploaded photo; delete an uploaded photo no longer used.
        const photos = await getTeamPhotosCollection();
        if (resolved.uploadedId) await photos.updateOne({ _id: resolved.uploadedId }, { $set: { memberId: id } });
        await photos.deleteMany({ memberId: id, ...(resolved.uploadedId ? { _id: { $ne: resolved.uploadedId } } : {}) });

        return NextResponse.json({ success: true, message: 'Member updated.' });
    } catch (error) {
        console.error('[admin/team/:id] edit failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the changes. Please try again.' }, { status: 503 });
    }
}

/** Show or hide a member on the website. JSON: { action: 'publish' | 'unpublish' }. */
export async function PATCH(request, { params }) {
    if (!isAuthenticated(request)) return unauthorized();
    const id = parseId(params.id);
    if (!id) return badId();

    let body;
    try { body = await request.json(); } catch { body = {}; }
    if (!['publish', 'unpublish'].includes(body.action)) {
        return NextResponse.json({ success: false, message: 'Unknown action.' }, { status: 400 });
    }
    try {
        const team = await getTeamCollection();
        const result = await team.updateOne({ _id: id }, { $set: { published: body.action === 'publish', updatedAt: new Date() } });
        if (!result.matchedCount) return NextResponse.json({ success: false, message: 'Member not found.' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin/team/:id] update failed:', error);
        return NextResponse.json({ success: false, message: 'Could not update the member.' }, { status: 503 });
    }
}

/** Remove a member with their uploaded photo and portfolio. A deleted built-in member does not come back. */
export async function DELETE(request, { params }) {
    if (!isAuthenticated(request)) return unauthorized();
    const id = parseId(params.id);
    if (!id) return badId();
    try {
        const team = await getTeamCollection();
        const result = await team.deleteOne({ _id: id });
        if (!result.deletedCount) return NextResponse.json({ success: false, message: 'Member not found.' }, { status: 404 });
        const photos = await getTeamPhotosCollection();
        await photos.deleteMany({ memberId: id });
        await deletePortfolios({ memberId: id });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin/team/:id] delete failed:', error);
        return NextResponse.json({ success: false, message: 'Could not delete the member.' }, { status: 503 });
    }
}
