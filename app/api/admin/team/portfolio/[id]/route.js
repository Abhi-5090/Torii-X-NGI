import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getTeamPortfoliosCollection, getTeamPortfolioPartsCollection } from '../../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../../lib/dashboard-auth';
import { PORTFOLIO_PART_BYTES, looksLikeHtml } from '../../../../../../lib/team-schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const fail = (message, status) => NextResponse.json({ success: false, message }, { status });

/** Upload part `?part=n` (raw bytes) of a portfolio started with POST /api/admin/team/portfolio. */
export async function PUT(request, { params }) {
    if (!isAuthenticated(request)) return fail('Unauthorized', 401);
    let id;
    try { id = new ObjectId(params.id); } catch { return fail('Invalid upload id.', 400); }
    const n = Number(new URL(request.url).searchParams.get('part'));

    try {
        const files = await getTeamPortfoliosCollection();
        const file = await files.findOne({ _id: id });
        if (!file || file.memberId) return fail('This upload has expired. Please choose the file again.', 404);
        if (!Number.isInteger(n) || n < 0 || n >= file.parts) return fail('Invalid part number.', 400);

        const data = Buffer.from(await request.arrayBuffer());
        const expected = n < file.parts - 1 ? PORTFOLIO_PART_BYTES : file.size - PORTFOLIO_PART_BYTES * (file.parts - 1);
        if (data.length !== expected) return fail('Part of the file did not arrive intact. Please try again.', 422);
        if (n === 0 && !looksLikeHtml(data.subarray(0, 4096).toString('utf8'))) {
            return fail('That file does not look like an HTML page. Please upload the portfolio .html file.', 422);
        }

        const parts = await getTeamPortfolioPartsCollection();
        await parts.updateOne({ fileId: id, n }, { $set: { data } }, { upsert: true });
        const received = await parts.countDocuments({ fileId: id });
        const complete = received === file.parts;
        if (complete) await files.updateOne({ _id: id }, { $set: { complete: true } });
        return NextResponse.json({ success: true, complete });
    } catch (error) {
        console.error('[admin/team/portfolio/:id] part failed:', error);
        return fail('Could not upload the file. Please try again.', 503);
    }
}
