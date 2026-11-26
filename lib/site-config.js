// Shared external links. Kept in one place so a changed invite link only needs
// updating here rather than in the header, the community pop-up, and the
// registration screens.

// NGI WhatsApp communities, one per batch (passout year). Shown as the list in
// the "Join Community" pop-up, and the registration screens link each student
// to the community for their program's passout year (communityForBatch below).
//
// `year` is the year of study for the 2026–27 academic year, matching the
// program data in lib/registration-schema.js (2030 passouts = 1st year).
// Update the `year` labels when the academic year rolls over. A community with
// a '#' link renders as "Link coming soon".
export const WHATSAPP_BATCH_COMMUNITIES = [
    { id: 'batch-2030', batch: '2030', label: 'Batch of 2030', year: '1st Year', url: 'https://chat.whatsapp.com/EyrGDcd3lQHBmD2QEN67np' },
    { id: 'batch-2029', batch: '2029', label: 'Batch of 2029', year: '2nd Year', url: 'https://chat.whatsapp.com/Eg032tAe6W6LXohdV14iUz' },
    { id: 'batch-2028', batch: '2028', label: 'Batch of 2028', year: '3rd Year', url: 'https://chat.whatsapp.com/DhXay8tDxFzKFvYX92EJyg' },
    { id: 'batch-2027', batch: '2027', label: 'Batch of 2027', year: '4th Year', url: 'https://chat.whatsapp.com/IiXlgd2KDQQ8TVcMMPK7Aq' },
    { id: 'batch-2026', batch: '2026', label: 'Batch of 2026', year: 'Passed out', url: 'https://chat.whatsapp.com/E0WswgidSvRCgcyiierRiu' }
];

/** The WhatsApp community for a passout year ("2029" or 2029), or null. */
export function communityForBatch(passoutYear) {
    return WHATSAPP_BATCH_COMMUNITIES.find((c) => c.batch === String(passoutYear || '')) || null;
}

// Partner sites the header logos link out to.
export const TORIIMINDS_URL = 'https://toriiminds.com/';
// Nagarjuna Group of Institutions (NCET) website.
export const COLLEGE_URL = 'https://ncet.co.in/';
