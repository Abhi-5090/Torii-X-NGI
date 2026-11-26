// NGI Landing Page — Team Members Data
//
// The order of this list is the order on the site (carousel + member pills).
//
// Photos: the site loads the 700x880 WebP cutouts in team/web/ (generated from
// the 1080px PNG sources in team/, trimmed and bottom-anchored so everyone is
// framed the same way).
//
// Entries marked "// PLACEHOLDER" have generic tagline / tags / highlights
// written from the person's role only. Replace them with the real details.
// Members without a portfolio page use `portfolioComingSoon: true`, and members
// without a `linkedin` URL get a "coming soon" toast on the LinkedIn icon.

const PHOTO_DIR = '/assets/images/ngi/project-images/team/web';

// Accent pairs cycle coral → orange → amber down the list, as in the original
// cards, so reordering members never puts two of the same colour side by side.
const ACCENTS = [
    { accentColor: 'var(--ngi-primary)', accentBg: 'var(--ngi-bg-coral-tint)' },
    { accentColor: 'var(--ngi-secondary)', accentBg: 'var(--ngi-bg-warm-tint)' },
    { accentColor: 'var(--ngi-tertiary)', accentBg: 'var(--ngi-bg-warm-offwhite)' },
];

const teamData = [
    { // PLACEHOLDER
        id: 'bhargava',
        name: 'Bhargava R',
        role: 'Manager',
        tagline: 'Keeping programs, people and timelines moving in step',
        photo: `${PHOTO_DIR}/Bhargava_R_Manager_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Program Management', 'Team Leadership', 'Operations', 'Stakeholder Relations'],
        highlights: [
            'Oversees day-to-day delivery of Torii programs on campus',
            'Coordinates trainers, schedules and resources across batches',
            'Works closely with college stakeholders to keep programs on track',
            'Focused on a smooth, well-run experience for every student'
        ]
    },
    { // PLACEHOLDER
        id: 'sudhir',
        name: 'Sudhir R',
        role: 'Manager',
        tagline: 'Driving smooth execution across teams and programs',
        photo: `${PHOTO_DIR}/Sudhir_R_Manager_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Program Management', 'Team Coordination', 'Planning', 'Quality Assurance'],
        highlights: [
            'Plans and tracks program milestones from kickoff to completion',
            'Aligns trainers, developers and operations around shared goals',
            'Monitors program quality and student outcomes',
            'Keeps communication clear between teams and partners'
        ]
    },
    {
        id: 'prasanth-kedarisetti',
        name: 'Prasanth Kedarisetti',
        role: 'Development Manager',
        tagline: '10+ years building Web, Mobile, AI & AR/VR products and leading engineering teams',
        photo: `${PHOTO_DIR}/Prasanth_Development_Manager_uniform.webp`,
        linkedin: 'https://www.linkedin.com/in/prasanth-kedarisetti/',
        portfolio: '/portfolios/prasanth.html',
        tags: ['MERN Stack', 'Unity (C#)', 'AR / VR', 'PHP', 'Project Management'],
        highlights: [
            'Project Manager (IT) with 10+ years of software engineering leadership',
            'Full Stack (MERN), Unity C#, AR/VR & PHP expert — built 16+ enterprise products',
            'Led 40+ cognitive games, public AR spectacles & Dockerized online compilers',
            'Delivered nationwide trainings in Full Stack, Unity, AR & VR development',
            '3× Best Developer of the Year & Unity Certified Associate'
        ]
    },
    { // PLACEHOLDER
        id: 'naveen',
        name: 'Naveen Kumar',
        role: 'Data Analytics Specialist',
        tagline: 'Turning raw data into clear insights and better decisions',
        photo: `${PHOTO_DIR}/Naveen_Kumar_Data_Analytics_Specialist.webp`,
        portfolioComingSoon: true,
        tags: ['Data Analytics', 'SQL', 'Excel', 'Data Visualization', 'Python'],
        highlights: [
            'Analyzes data to uncover trends and actionable insights',
            'Builds reports and dashboards for program and student metrics',
            'Cleans, models and validates data from multiple sources',
            'Trains students in practical, industry-style data analysis'
        ]
    },
    { // PLACEHOLDER
        id: 'peter',
        name: 'Peter',
        role: 'Branding Team Manager',
        tagline: 'Shaping how Torii looks, sounds and shows up',
        photo: `${PHOTO_DIR}/Peter_Branding_Team_Manager_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Brand Strategy', 'Creative Direction', 'Campaigns', 'Team Leadership'],
        highlights: [
            'Leads the branding team across events, campaigns and digital channels',
            'Sets the creative direction for Torii’s visual identity',
            'Plans launch campaigns for new programs and initiatives',
            'Keeps every touchpoint consistent with the Torii brand'
        ]
    },
    { // PLACEHOLDER
        id: 'kiran',
        name: 'Kiran Immandi',
        role: 'Branding Team Lead',
        tagline: 'Leading the creative work behind Torii’s brand',
        photo: `${PHOTO_DIR}/Kiran_Immandi_Branding_Team_Lead_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Branding', 'Visual Design', 'Social Media', 'Event Creatives'],
        highlights: [
            'Leads day-to-day creative work for the branding team',
            'Produces visuals for events, programs and social media',
            'Keeps designs consistent with Torii’s brand guidelines',
            'Collaborates with managers to bring campaigns to life'
        ]
    },
    { // PLACEHOLDER
        id: 'satish',
        name: 'Satish',
        role: 'Designer',
        tagline: 'Designing visuals that make every program stand out',
        photo: `${PHOTO_DIR}/Satish_Designer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Graphic Design', 'Posters & Banners', 'Social Creatives', 'Layout'],
        highlights: [
            'Designs posters, banners and digital creatives',
            'Creates program and event visuals for print and web',
            'Turns briefs into clean, on-brand layouts',
            'Works with the branding team on campaign assets'
        ]
    },
    { // PLACEHOLDER
        id: 'abraham',
        name: 'Abraham Rajan',
        role: 'Trainer',
        tagline: 'Hands-on technical training that turns concepts into skills',
        photo: `${PHOTO_DIR}/Abraham_Rajan_Trainer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Technical Training', 'Problem Solving', 'Programming', 'Mentorship'],
        highlights: [
            'Delivers hands-on, project-based training sessions',
            'Breaks down complex topics into clear, practical steps',
            'Mentors students through assignments and assessments',
            'Focused on building strong problem-solving fundamentals'
        ]
    },
    { // PLACEHOLDER
        id: 'harshavardhini',
        name: 'Harshavardhini',
        role: 'Trainer',
        tagline: 'Helping students build confidence through practice',
        photo: `${PHOTO_DIR}/Harshavardhini_Trainer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Technical Training', 'Programming', 'Assessments', 'Mentorship'],
        highlights: [
            'Conducts practical, example-driven training sessions',
            'Designs exercises that reinforce each module',
            'Guides students through assessments and project work',
            'Focused on steady, measurable student improvement'
        ]
    },
    {
        id: 'abhilash',
        name: 'Anala Abhilash',
        role: 'Power BI & Snowflake Developer',
        tagline: 'Building automated Power BI dashboards & reporting solutions that drive smarter, faster decisions',
        photo: `${PHOTO_DIR}/Abhilash_PowerBI_Snowflake_Developer_uniform.webp`,
        linkedin: 'https://www.linkedin.com/in/anala-abhilash/',
        portfolio: '/portfolios/abhilash.html',
        tags: ['Power BI', 'Snowflake', 'SQL & DAX', 'Power Platform', 'Data Modeling'],
        highlights: [
            'Data Analyst with 3+ years turning complex operational data into actionable dashboards',
            'Core toolkit spans Power BI, SQL, Snowflake, Excel & the Microsoft Power Platform',
            'Designs star-schema data models with advanced DAX & Power Query transformations',
            'Delivered 50+ end-to-end BI solutions processing 300K+ records',
            'Holds 5 global certifications across Microsoft, Oracle & Snowflake; trained 700+ students'
        ]
    },
    { // PLACEHOLDER
        id: 'harika',
        name: 'Harika',
        role: 'Trainer',
        tagline: 'Making technical learning clear, structured and engaging',
        photo: `${PHOTO_DIR}/Harika_Trainer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Technical Training', 'Programming', 'Curriculum Delivery', 'Mentorship'],
        highlights: [
            'Delivers structured, hands-on training sessions',
            'Supports students one-on-one through doubts and practice',
            'Tracks student progress and adapts sessions to the batch',
            'Encourages consistent practice and strong fundamentals'
        ]
    },
    { // PLACEHOLDER
        id: 'jayanth',
        name: 'Jayanth',
        role: 'Full Stack Developer',
        tagline: 'Turning ideas into fast, reliable web products',
        photo: `${PHOTO_DIR}/Jayanth_Full_Stack_Developer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Git'],
        highlights: [
            'Develops features across the full web stack',
            'Builds clean, reusable UI components',
            'Integrates APIs and manages application data',
            'Focused on performance, reliability and clean code'
        ]
    },
    { // PLACEHOLDER
        id: 'prasanth-b',
        name: 'Prasanth B',
        role: 'Full Stack Developer',
        tagline: 'Building web applications end to end, from database to UI',
        photo: `${PHOTO_DIR}/Prasanth_Full_Stack_Developer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['React.js', 'Node.js', 'MongoDB', 'REST APIs', 'JavaScript'],
        highlights: [
            'Builds full stack web applications across frontend and backend',
            'Develops responsive interfaces with modern JavaScript frameworks',
            'Designs REST APIs and database models',
            'Contributes to Torii’s internal tools and platforms'
        ]
    },
    {
        id: 'manikanta',
        name: 'Manikanta',
        role: 'ServiceNow Developer',
        tagline: 'Enterprise Platform Automation & Workflow Specialist',
        photo: `${PHOTO_DIR}/Manikanta_ServiceNow_Developer_uniform.webp`,
        linkedin: 'https://www.linkedin.com/in/manikanta-srighakollapu/',
        portfolio: '/portfolios/manikanta.html',
        tags: ['ServiceNow CAD', 'Now Platform', 'GlideRecord', 'Flow Designer', 'IntegrationHub'],
        highlights: [
            'ServiceNow Developer with deep expertise in Now Platform enterprise architecture',
            'Hands-on experience in GlideRecord scripting, Business Rules, Client Scripts & UI Policies',
            'Specialized in Flow Designer, Process Automation & IntegrationHub REST APIs',
            'Expertise in CSA & CAD certification mentoring and enterprise workflow engineering',
            'Passionate technical mentor guiding students into high-growth enterprise platform roles'
        ]
    },
    { // PLACEHOLDER
        id: 'veera-babu',
        name: 'Veera Babu',
        role: 'VLSI Trainer',
        tagline: 'Guiding students into chip design and VLSI engineering',
        photo: `${PHOTO_DIR}/Veera_Babu_VLSI_Trainer_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['VLSI Design', 'Digital Electronics', 'Verilog', 'Semiconductor Basics'],
        highlights: [
            'Trains students in VLSI design fundamentals',
            'Covers digital logic, HDL coding and design flows',
            'Runs hands-on lab sessions on real design problems',
            'Prepares students for core electronics and semiconductor roles'
        ]
    },
    { // PLACEHOLDER
        id: 'hemavathi',
        name: 'Hemavathi',
        role: 'Office Assistant',
        tagline: 'Keeping the Torii office organized and running smoothly',
        photo: `${PHOTO_DIR}/Hemavathi_Office_Assistant_uniform.webp`,
        portfolioComingSoon: true,
        tags: ['Office Administration', 'Coordination', 'Records', 'Student Support'],
        highlights: [
            'Handles day-to-day office administration',
            'Coordinates schedules, rooms and materials for sessions',
            'Maintains records and documentation',
            'First point of contact for student and visitor queries'
        ]
    },
];

export default teamData.map((member, i) => ({ ...ACCENTS[i % ACCENTS.length], ...member }));
