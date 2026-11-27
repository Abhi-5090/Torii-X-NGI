// The institutions of the Nagarjuna Group, shown one at a time in the strip
// between "Who We Are" and "Programs We Offer" (components/ngi/colleges-strip.jsx).
//
// Logos live in public/assets/images/ngi/colleges/ (transparent PNG, named after
// the institution). `ratio` is the logo's width ÷ height: the strip uses it to
// give every logo the same visual weight, so wide and square logos look uniform.
// The Pre-University College logo is shared by the PU College (two campuses)
// and the NEET Academy. An optional `location` shows on a second line.

const DIR = '/assets/images/ngi/colleges';

const LOGOS = {
    novus: { logo: `${DIR}/novus-early-learning-center.png`, ratio: 702 / 184 },
    ncet: { logo: `${DIR}/nagarjuna-college-of-engineering-and-technology.png`, ratio: 611 / 300 },
    ncms: { logo: `${DIR}/nagarjuna-college-of-management-studies.png`, ratio: 622 / 300 },
    degree: { logo: `${DIR}/nagarjuna-degree-college.png`, ratio: 318 / 300 },
    pu: { logo: `${DIR}/nagarjuna-pre-university-college.png`, ratio: 387 / 300 },
    vidyaniketan: { logo: `${DIR}/nagarjuna-vidyaniketan.png`, ratio: 318 / 300 },
};

// Display order: NCET, NCMS, NDC, NPUC, NEET Academy, Vidyaniketan, Novus.
const colleges = [
    { name: 'Nagarjuna College of Engineering & Technology', ...LOGOS.ncet },
    { name: 'Nagarjuna College of Management Studies', ...LOGOS.ncms },
    { name: 'Nagarjuna Degree College', ...LOGOS.degree },
    // One institution, two campuses: the campuses show on a second line.
    { name: 'Nagarjuna Pre-University College', location: 'Yelahanka, Chikkaballapura', ...LOGOS.pu },
    { name: 'Nagarjuna NEET Academy', ...LOGOS.pu },
    { name: 'Nagarjuna Vidyaniketan', ...LOGOS.vidyaniketan },
    { name: 'Novus Early Learning Center', ...LOGOS.novus },
];

export const INSTITUTION_COUNT = colleges.length;

export default colleges;
