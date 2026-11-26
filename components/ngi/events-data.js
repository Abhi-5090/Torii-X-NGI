// Events shown in the "Moments That Define Us" section (components/ngi/events.jsx).
//
// HOW TO ADD OR EDIT AN EVENT
// ---------------------------
// Add an object to the array below. The carousel and the detail view are built
// entirely from this data, in this order.
//
//   id                URL-safe slug, unique per event.
//   title             Full event title.
//   category          Short label shown as a pill ("Inauguration", "Hackathon"…).
//   date              ISO date, YYYY-MM-DD. Formatted automatically.
//   venue             Where it happened.
//   shortDescription  One or two sentences. Shown on the carousel card and as
//                     the lead paragraph of the detail view.
//   longDescription   Array of paragraphs: the full story of the event.
//   highlights        Array of short bullet points: what was done.
//   stats             Optional, up to 3 { value, label } tiles ("1,200+" / "Students").
//   tags              Small keyword pills.
//   cover             The best photo of the event, 16:9. Used on the carousel
//                     card and at the top of the detail view.
//   layout            Optional. 'portrait' when most photos are portraits (4:5):
//                     they are then shown whole in 4:5 tiles (two large, then a
//                     row of smaller ones) instead of being cropped.
//   photos            3 to 5 more photos, laid out automatically:
//                       photos[0]      square tile (a square photo fits best)
//                       photos[1..2]   two 16:9 tiles stacked beside it
//                       photos[3]      5 photos in total: a wide cinematic strip
//                       photos[3..4]   6 photos in total: a pair of 16:9 tiles
//                     Any photo shape works; it is cropped to fill its slot.
//                     Add { src, position: 'center 30%' } instead of a plain
//                     path to choose which part of a photo stays in view.
//
// Photos live in public/assets/images/ngi/events/<id>/ (cover.webp, 1.webp…).
// Recommended: cover 1600×900, other photos about 1400px on the long side.
//
// TODO: the dates and venues below are placeholders. Replace them with the
// real ones. The descriptions are drafts written from the photos.

const IMG = '/assets/images/ngi/events';

const photosOf = (slug, count) => ({
    cover: `${IMG}/${slug}/cover.webp`,
    photos: Array.from({ length: count }, (_, i) => `${IMG}/${slug}/${i + 1}.webp`),
});

const eventsData = [
    {
        id: 'red-hat-academy-day',
        title: 'Red Hat Academy Day',
        category: 'Open Source',
        date: '2026-08-28',
        venue: 'Seminar Hall, 2nd Floor',
        shortDescription:
            'Red Hat Academy came to NGI for an afternoon of open source, bridging the gap between education and industry for a hall full of students.',
        longDescription: [
            'Red Hat Academy Day brought Red Hat Academy and Nagarjuna College of Engineering & Technology together in the seminar hall, under the theme "Bridging the Gap Between Education and Industry".',
            'Students learned how open source powers modern IT, and how Red Hat Academy courses and certifications in Linux and enterprise technologies can open doors to industry careers.',
            'True to the day\'s motto, "Learn. Engage. Grow.", interactive quiz rounds and a spin-the-wheel challenge kept the hall engaged, with winners walking away with Red Hat Academy goodies.',
        ],
        highlights: [
            'Red Hat Academy Day held with Nagarjuna College of Engineering & Technology',
            '"The Future is Open Source": careers and certifications in open source',
            'Interactive quiz and spin-the-wheel challenges',
            'Red Hat Academy goodies for every winner',
        ],
        tags: ['Red Hat', 'Open Source', 'Linux', 'Certifications'],
        // These photos are portraits (4:5), so this event uses the portrait grid:
        // each photo is shown whole instead of being cropped to a wide tile.
        layout: 'portrait',
        ...photosOf('red-hat-academy-day', 5),
        photos: [
            `${IMG}/red-hat-academy-day/2.webp`,
            `${IMG}/red-hat-academy-day/4.webp`,
            `${IMG}/red-hat-academy-day/3.webp`,
            `${IMG}/red-hat-academy-day/5.webp`,
            `${IMG}/red-hat-academy-day/1.webp`,
        ],
    },
    {
        id: 'achievers-day-2026',
        title: 'Achievers Day 2026',
        category: 'Celebration',
        date: '2026-04-18', // TODO: confirm
        venue: 'NGI Campus',
        shortDescription:
            'A campus-wide celebration of the students who turned hard work into offers, honouring every achiever alongside their families and mentors.',
        longDescription: [
            'Achievers Day brought the whole NGI community together to celebrate the students whose preparation paid off, from placement offers to certifications and competition wins.',
            'Achievers walked up with their families to be recognised by NGI leadership and the ToriiMinds team, with industry guests sharing what it takes to keep growing after the first offer.',
            'The day closed with a grand group photograph on the lawns, a reminder that every achiever is part of a much larger story at NGI.',
        ],
        highlights: [
            'Felicitation of student achievers together with their families',
            'Talks from industry guests and NGI leadership',
            'A packed auditorium cheering on every name',
            'A campus-wide "Congratulations Achievers" group photograph',
        ],
        tags: ['Placements', 'Recognition', 'Community'],
        ...photosOf('achievers-day-2026', 4),
        photos: [
            `${IMG}/achievers-day-2026/1.webp`,
            `${IMG}/achievers-day-2026/2.webp`,
            `${IMG}/achievers-day-2026/3.webp`,
            { src: `${IMG}/achievers-day-2026/4.webp`, position: 'center 40%' },
        ],
    },
    {
        id: 'ai-centre-of-excellence',
        title: 'AI Centre of Excellence Inauguration',
        category: 'Inauguration',
        date: '2026-03-20', // TODO: confirm
        venue: 'AI Centre of Excellence, NGI',
        shortDescription:
            'NGI opened its AI Centre of Excellence with ToriiMinds: a dedicated space for students to learn, build and experiment with AI.',
        longDescription: [
            'The AI Centre of Excellence was formally inaugurated with a ribbon-cutting ceremony led by NGI leadership and the ToriiMinds team.',
            'Guests toured the new facility, including the "Road Map to Become an AI Engineer" wall that lays out the learning path students follow from fundamentals to industry-ready AI skills.',
            'A dais session followed, where leaders spoke about how the centre will support hands-on AI programs, projects and certifications for NGI students.',
        ],
        highlights: [
            'Ribbon-cutting inauguration of the AI Centre of Excellence',
            'Guided tour of the new AI lab and learning spaces',
            'Unveiling of the AI Engineer learning roadmap',
            'Dais session on the future of AI education at NGI',
        ],
        tags: ['AI', 'Infrastructure', 'Innovation'],
        ...photosOf('ai-centre-of-excellence', 4),
        photos: [
            `${IMG}/ai-centre-of-excellence/1.webp`,
            `${IMG}/ai-centre-of-excellence/2.webp`,
            `${IMG}/ai-centre-of-excellence/3.webp`,
            { src: `${IMG}/ai-centre-of-excellence/4.webp`, position: 'center 45%' },
        ],
    },
    {
        id: 'nt-square-skill-edge',
        title: 'NT Square: Skill Edge',
        category: 'Career Drive',
        date: '2026-02-24', // Skill Edge ran 24–26 Feb; TODO: confirm the year
        venue: 'NT Square, NGI Campus',
        shortDescription:
            'Three days at NT Square under the theme "Gateway to AI Career", where students lined up to learn how to start their AI journey.',
        longDescription: [
            'Skill Edge set up at NT Square, the campus hub, from 24th to 26th February with one message for every student: your gateway to an AI career starts here.',
            'The ToriiMinds team met students throughout the day, explaining the learning paths, programs and certifications that lead to AI roles.',
            'By day three the crowds around the booth said it all, with students from every year stopping by to sign up and ask questions.',
        ],
        highlights: [
            'Three days of Skill Edge at NT Square (24–26 Feb)',
            '"Gateway to AI Career" guidance for every student',
            'One-on-one conversations with the ToriiMinds team',
            'Huge turnout from students across all years',
        ],
        stats: [
            { value: '3', label: 'Days' },
            { value: 'AI', label: 'Career focus' },
            { value: 'All', label: 'Years welcome' },
        ],
        tags: ['AI Careers', 'Guidance', 'Skill Edge'],
        ...photosOf('nt-square-skill-edge', 5),
        photos: [
            `${IMG}/nt-square-skill-edge/1.webp`,
            `${IMG}/nt-square-skill-edge/2.webp`,
            `${IMG}/nt-square-skill-edge/3.webp`,
            { src: `${IMG}/nt-square-skill-edge/4.webp`, position: 'center 55%' },
            { src: `${IMG}/nt-square-skill-edge/5.webp`, position: 'center 62%' },
        ],
    },
    {
        id: 'hr-conclave',
        title: 'HR Conclave',
        category: 'Conclave',
        date: '2026-02-12', // TODO: confirm
        venue: 'NGI Auditorium',
        shortDescription:
            'HR leaders from leading companies met NGI students and faculty to talk hiring, skills and what makes a candidate stand out.',
        longDescription: [
            'The HR Conclave brought senior HR and talent leaders to the NGI campus for an open conversation about how hiring is changing and what companies look for in fresh graduates.',
            'The day opened with a round-table with NGI leadership, followed by keynote talks and a panel discussion on stage in front of a full auditorium of students.',
            'Students got to meet the speakers in person afterwards, asking about interviews, internships and the skills that matter most.',
        ],
        highlights: [
            'Round-table between HR leaders and NGI leadership',
            'Keynotes on building skilled careers',
            'Panel discussion on hiring trends and graduate readiness',
            'One-on-one conversations between students and speakers',
        ],
        tags: ['Hiring', 'Industry', 'Careers'],
        ...photosOf('hr-conclave', 4),
        photos: [
            { src: `${IMG}/hr-conclave/1.webp`, position: '38% center' },
            `${IMG}/hr-conclave/2.webp`,
            `${IMG}/hr-conclave/3.webp`,
            `${IMG}/hr-conclave/4.webp`,
        ],
    },
    {
        id: 'ikya-2026',
        title: 'IKYA 2026',
        category: 'Project Expo',
        date: '2026-02-05', // TODO: confirm
        venue: 'NGI Campus',
        shortDescription:
            'AI Ready Engineer students showcased the apps they built, from stall to stall, to faculty, visitors and fellow students.',
        longDescription: [
            'IKYA 2026 turned the campus walkway into a row of project stalls where AI Ready Engineer students presented the products they designed and built during the program.',
            'Teams demoed their apps live, walked visitors through their posters and explained the problems they set out to solve, the tech behind them and what they learned along the way.',
            'Over multiple days, faculty, parents and students stopped by to try the apps and give feedback, turning the expo into a real launch for every team.',
        ],
        highlights: [
            'Student-built AI apps presented at dedicated project stalls',
            'Live demos and poster walkthroughs for every team',
            'Feedback from faculty, parents and visitors',
            'A multi-day expo celebrating the AI Ready Engineer program',
        ],
        tags: ['AI Ready Engineer', 'Projects', 'Showcase'],
        ...photosOf('ikya-2026', 5),
        photos: [
            `${IMG}/ikya-2026/1.webp`,
            `${IMG}/ikya-2026/2.webp`,
            `${IMG}/ikya-2026/3.webp`,
            { src: `${IMG}/ikya-2026/4.webp`, position: 'center 30%' },
            { src: `${IMG}/ikya-2026/5.webp`, position: 'center 42%' },
        ],
    },
    {
        id: 'scinova-2026',
        title: 'SCINOVA 2026',
        category: 'Tech Symposium',
        date: '2026-01-29', // TODO: confirm
        venue: 'NGI Seminar Hall',
        shortDescription:
            'NGI’s science and innovation symposium, with talks to a packed hall and felicitations for the guests who shaped the day.',
        longDescription: [
            'SCINOVA 2026 filled the seminar hall with students and faculty for a day dedicated to science, technology and innovation.',
            'Speakers took the stage to talk about emerging technology and the mindset it takes to build something new, holding the attention of a full house.',
            'The symposium also honoured its guests and contributors with felicitations from NGI leadership.',
        ],
        highlights: [
            'Talks on innovation and emerging technology',
            'A packed hall of students and faculty',
            'Felicitation of guests by NGI leadership',
            'Celebrating a culture of science and building',
        ],
        tags: ['Innovation', 'Talks', 'Symposium'],
        ...photosOf('scinova-2026', 5),
        photos: [
            `${IMG}/scinova-2026/1.webp`,
            `${IMG}/scinova-2026/2.webp`,
            `${IMG}/scinova-2026/3.webp`,
            { src: `${IMG}/scinova-2026/4.webp`, position: 'center 48%' },
            { src: `${IMG}/scinova-2026/5.webp`, position: 'center 48%' },
        ],
    },
    {
        id: 'github-campus-program',
        title: 'GitHub Campus Program',
        category: 'Industry Session',
        date: '2026-01-22', // TODO: confirm
        venue: 'NGI Campus',
        shortDescription:
            'An interaction with Mr. Karthik, GitHub Director, and the launch of the GitHub Campus Program at NGI.',
        longDescription: [
            'The GitHub Campus Program arrived at NGI with a ribbon-cutting launch and an interaction with Mr. Karthik, Director at GitHub.',
            'In a packed session, students heard how open source, version control and a strong GitHub profile help them learn faster and get noticed by recruiters.',
            'The visit wrapped up with a group photo of the guests, the ToriiMinds team and student volunteers.',
        ],
        highlights: [
            'Launch of the GitHub Campus Program at NGI',
            'Interaction with Mr. Karthik, GitHub Director',
            'Session on open source and building a developer profile',
            'Group photo with guests, mentors and student volunteers',
        ],
        tags: ['GitHub', 'Open Source', 'Developer Skills'],
        ...photosOf('github-campus-program', 5),
        photos: [
            `${IMG}/github-campus-program/1.webp`,
            `${IMG}/github-campus-program/2.webp`,
            `${IMG}/github-campus-program/3.webp`,
            { src: `${IMG}/github-campus-program/4.webp`, position: 'center 32%' },
            { src: `${IMG}/github-campus-program/5.webp`, position: 'center 55%' },
        ],
    },
    {
        id: 'project-week',
        title: 'Project Week',
        category: 'Hands-on Week',
        date: '2025-11-17', // TODO: confirm
        venue: 'NGI Library & Labs',
        shortDescription:
            'A full week of building: students planned, designed and coded their projects side by side with ToriiMinds mentors.',
        longDescription: [
            'Project Week set aside regular classes so students could focus on one thing: building a project from idea to working demo.',
            'Teams started on paper with problem statements, user flows and architecture sketches, then moved to laptops to build, test and iterate.',
            'ToriiMinds mentors moved from table to table all week, unblocking teams and pushing them to ship something they were proud of.',
        ],
        highlights: [
            'Idea-to-demo project sprints for every team',
            'Design sessions on paper before writing code',
            'Hands-on building and testing on laptops',
            'Mentors guiding teams at every table',
        ],
        tags: ['Projects', 'Teamwork', 'Building'],
        ...photosOf('project-week', 4),
    },
    {
        id: 'project-street',
        title: 'Project Street',
        category: 'Project Showcase',
        date: '2025-10-15', // TODO: confirm
        venue: 'NGI Campus Walkway',
        shortDescription:
            'The campus walkway became a street of projects, with student teams presenting their work on easels to mentors, faculty and curious crowds.',
        longDescription: [
            'Project Street took project reviews out of the classroom and onto the campus walkway. Every team set up an easel with a poster explaining their project, from cloud services to data dashboards.',
            'Mentors from ToriiMinds and NGI faculty moved from stand to stand, listening to each pitch, asking questions and giving feedback on the spot.',
            'Students from across the campus walked the street too, turning it into an open exhibition of what NGI teams are building.',
        ],
        highlights: [
            'Open-air project presentations along the campus walkway',
            'Posters on projects like a Student Enrollment & Retention Analysis Dashboard and Google Cloud core services',
            'On-the-spot feedback from ToriiMinds mentors and NGI faculty',
            'Crowds of students exploring every team’s work',
        ],
        tags: ['Projects', 'Presentations', 'Showcase'],
        ...photosOf('project-street', 5),
    },
    {
        id: 'toriiminds-at-ngi',
        title: 'ToriiMinds at NGI',
        category: 'Launch',
        date: '2025-09-01', // TODO: confirm
        venue: 'NGI Campus',
        shortDescription:
            'The day ToriiMinds arrived at NGI: a full house, the ToriiMinds team on stage, and students speaking about the journey ahead.',
        longDescription: [
            'ToriiMinds launched at NGI in front of a packed venue of students, with the leadership laying out the vision for industry-ready training on campus.',
            'The ToriiMinds team took the stage together, and students stepped up to the mic to share what they hope to build and become.',
            'Outside the hall, the team walked students through the programs, setting the tone for a clear vision, a plan and its execution.',
        ],
        highlights: [
            'Launch keynote to a full house of NGI students',
            'The ToriiMinds team introduced on stage',
            'Students sharing their goals on the mic',
            'Program walkthroughs for every year',
        ],
        tags: ['ToriiMinds', 'Launch', 'Vision'],
        ...photosOf('toriiminds-at-ngi', 5),
    },
];

// Always shown newest first, whatever order the entries above are written in.
export default [...eventsData].sort((a, b) => b.date.localeCompare(a.date));
