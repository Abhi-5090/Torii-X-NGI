import { NextResponse } from 'next/server';
import { getTeamPortfoliosCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { PORTFOLIO_MAX_BYTES, portfolioPartCount } from '../../../../../lib/team-schema';
import { cleanupOrphanPortfolios } from '../../../../../lib/team-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Start uploading a portfolio HTML file. JSON: { name, size }. Returns { id, parts };
 * the browser then sends each part to PUT /api/admin/team/portfolio/<id>?part=n.
 * The file is attached to a member when the member is saved.
 */
export async function POST(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
    }
    const name = String(body?.name || '').replace(/[^\w.\- ]+/g, '').trim().slice(0, 120);
    const size = Number(body?.size);
    if (!/\.html?$/i.test(name)) {
        return NextResponse.json({ success: false, message: 'The portfolio must be an HTML file (.html).' }, { status: 422 });
    }
    if (!Number.isInteger(size) || size < 1) {
        return NextResponse.json({ success: false, message: 'That file is empty.' }, { status: 422 });
    }
    if (size > PORTFOLIO_MAX_BYTES) {
        return NextResponse.json({ success: false, message: `That file is too large (max ${PORTFOLIO_MAX_BYTES / 1024 / 1024}MB).` }, { status: 413 });
    }
    try {
        const files = await getTeamPortfoliosCollection();
        const parts = portfolioPartCount(size);
        const result = await files.insertOne({ name, size, parts, complete: false, memberId: null, createdAt: new Date() });
        cleanupOrphanPortfolios().catch(() => {});
        return NextResponse.json({ success: true, id: String(result.insertedId), parts }, { status: 201 });
    } catch (error) {
        console.error('[admin/team/portfolio] start failed:', error);
        return NextResponse.json({ success: false, message: 'Could not start the upload. Please try again.' }, { status: 503 });
    }
}
