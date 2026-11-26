'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react';
import programsData from './programs-data';
import ProgramDetailModal from './program-detail-modal';

// Distinct course items linked to programs with rich highlights
const coursesList = [
    // ---- 1st Year: Bamboo Coder ----
    {
        id: 'bamboo-c',
        programId: 'bamboo',
        title: 'C Programming & Logic Building',
        category: 'core',
        categoryLabel: 'Foundation',
        programName: 'Bamboo Coder',
        programYear: '1st Year',
        modulesCount: '9 Modules',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-secondary) 0%, var(--ngi-primary) 100%)',
        accentBg: 'var(--ngi-bg-coral-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
        ),
        description: 'Master computer science fundamentals, memory models, pointer arithmetic, 2D arrays, strings, pointers and structures.',
        highlights: [
            'Pointer arithmetic & dynamic memory management',
            'Searching, sorting & matrix problem solving'
        ],
        tags: ['C Fundamentals', 'Pointer Arithmetic', 'Dynamic Memory', 'Structures', 'Modular Design'],
        courseIndex: 0,
    },
    {
        id: 'bamboo-python',
        programId: 'bamboo',
        title: 'Python Programming & Logic Building',
        category: 'core',
        categoryLabel: 'Foundation',
        programName: 'Bamboo Coder',
        programYear: '1st Year',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-secondary) 0%, var(--ngi-primary) 100%)',
        accentBg: 'var(--ngi-bg-coral-tint)',
        modulesCount: '9 Modules',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
                <line x1="14" y1="4" x2="10" y2="20" />
            </svg>
        ),
        description: 'Learn to think like a programmer with Python: clean syntax, strong logic building and problem solving with lists, strings, dictionaries, files and OOP basics.',
        highlights: [
            'Loops, functions & recursion for logic building',
            'Lists, strings, dictionaries & sets in practice'
        ],
        tags: ['Python Basics', 'Logic Building', 'Lists & Strings', 'Dictionaries & Sets', 'OOP Basics'],
        courseIndex: 1,
    },
    // ---- 2nd Year: SkillUp Coder ----
    {
        id: 'skillup-problem-solving-dsa',
        programId: 'skillup',
        title: 'Data Structures',
        category: 'dsa',
        categoryLabel: 'Data Structures',
        programName: 'SkillUp Coder',
        programYear: '2nd Year',
        modulesCount: '10 Modules',
        accentColor: 'var(--ngi-secondary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-tertiary) 0%, var(--ngi-secondary) 100%)',
        accentBg: 'var(--ngi-bg-warm-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <circle cx="5" cy="19" r="3" />
                <circle cx="19" cy="19" r="3" />
                <line x1="12" y1="8" x2="5" y2="16" />
                <line x1="12" y1="8" x2="19" y2="16" />
            </svg>
        ),
        description: 'One end-to-end track from programming fundamentals through core data structures and algorithms — arrays, strings, searching, sorting, hashing, recursion, stacks, queues, linked lists and trees.',
        highlights: [
            'Big-O analysis, hashing, two pointers & sliding window',
            'Stacks, queues, linked lists & binary tree traversals'
        ],
        tags: ['Arrays & Strings', 'Searching & Sorting', 'Hashing & Sets', 'Recursion', 'Linked Lists & Trees'],
        courseIndex: 0,
    },
    {
        id: 'skillup-java',
        programId: 'skillup',
        title: 'Java Programming',
        category: 'core',
        categoryLabel: 'Programming',
        programName: 'SkillUp Coder',
        programYear: '2nd Year',
        accentColor: 'var(--ngi-secondary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-tertiary) 0%, var(--ngi-secondary) 100%)',
        accentBg: 'var(--ngi-bg-warm-tint)',
        modulesCount: '9 Modules',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8h1a3 3 0 0 1 0 6h-1" />
                <path d="M3 8h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" />
                <line x1="7" y1="2" x2="7" y2="5" />
                <line x1="11" y1="2" x2="11" y2="5" />
            </svg>
        ),
        description: 'Master Java from the ground up: methods and arrays, object-oriented programming, exception handling and the Collections Framework every Java interview expects.',
        highlights: [
            'OOP: encapsulation, inheritance, polymorphism & abstraction',
            'Collections Framework, lambdas & streams'
        ],
        tags: ['Java Fundamentals', 'OOP', 'Exception Handling', 'Collections', 'Streams'],
        courseIndex: 1,
    },
    {
        id: 'skillup-industry-readiness',
        programId: 'skillup',
        title: 'Industry Readiness',
        category: 'career',
        categoryLabel: 'Career Skills',
        programName: 'SkillUp Coder',
        programYear: '2nd Year',
        accentColor: 'var(--ngi-secondary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-tertiary) 0%, var(--ngi-secondary) 100%)',
        accentBg: 'var(--ngi-bg-warm-tint)',
        modulesCount: '7 Modules',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="2" y1="13" x2="22" y2="13" />
            </svg>
        ),
        description: 'Bridge college and the workplace: Git and GitHub, web and SQL basics, industry practices, aptitude, communication skills and mock interviews.',
        highlights: [
            'Git, GitHub, SQL & industry engineering practices',
            'Aptitude, resume building & mock interviews'
        ],
        tags: ['Git & GitHub', 'SQL', 'Agile', 'Aptitude', 'Mock Interviews'],
        courseIndex: 2,
    },
    // ---- 3rd Year: AI Ready Engineer ----
    {
        id: 'aiready-ai-engineer',
        programId: 'aiready',
        title: 'AI Engineer',
        category: 'ai',
        categoryLabel: 'AI Engineering',
        programName: 'AI Ready Engineer',
        programYear: '3rd Year',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'var(--ngi-gradient-primary)',
        accentBg: 'var(--ngi-bg-warm-offwhite)',
        modulesCount: '9 Modules',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
            </svg>
        ),
        description: 'From Python to production AI: machine learning and deep learning, generative AI with LLM APIs, RAG, AI agents and deploying complete AI applications.',
        highlights: [
            'LLM APIs, prompt engineering, RAG & AI agents',
            'Build and deploy an end-to-end AI capstone'
        ],
        tags: ['Machine Learning', 'Generative AI', 'RAG', 'AI Agents', 'Deployment'],
        courseIndex: 0,
    },
    {
        id: 'aiready-placement-readiness',
        programId: 'aiready',
        title: 'Placement Readiness',
        category: 'dsa',
        categoryLabel: 'Placements',
        programName: 'AI Ready Engineer',
        programYear: '3rd Year',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'var(--ngi-gradient-primary)',
        accentBg: 'var(--ngi-bg-warm-offwhite)',
        modulesCount: '10 Modules',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                <path d="M17 5h3v2a3 3 0 0 1-3 3" />
                <path d="M7 5H4v2a3 3 0 0 0 3 3" />
            </svg>
        ),
        description: 'Get placement-ready with coding, competitive coding and data structures & algorithms: interview patterns, regular contests and company-wise mock interviews.',
        highlights: [
            'DSA interview patterns: trees, graphs & dynamic programming',
            'Competitive coding contests & company-wise mock interviews'
        ],
        tags: ['Coding', 'Competitive Coding', 'DSA', 'Contests', 'Mock Interviews'],
        courseIndex: 1,
    },
    /* HIDDEN (archived): previous AI Ready courses (Full Stack + AI, Flutter + AI, AWS + AI, ServiceNow)
       are commented out so they are not displayed. Remove this wrapper to show them.
    {
        id: 'aiready-fullstack',
        programId: 'aiready',
        title: 'Full Stack Development + AI Integration',
        category: 'dev',
        categoryLabel: 'Full Stack',
        programName: 'AI Ready Program',
        programYear: '3rd Year',
        modulesCount: '8 Modules',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'var(--ngi-gradient-primary)',
        accentBg: 'var(--ngi-bg-coral-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
                <line x1="14" y1="4" x2="10" y2="20" />
            </svg>
        ),
        description: 'End-to-end modern web engineering with HTML5, CSS3, JavaScript, React.js, Node.js, Express, MongoDB, and Generative AI APIs.',
        highlights: [
            'Full-stack MERN with JWT authentication',
            'Streaming AI chatbots & Docker deployments'
        ],
        tags: ['React.js', 'Node.js & Express', 'MongoDB Atlas', 'Gemini / Claude AI', 'Docker CI/CD'],
        courseIndex: 0,
    },
    {
        id: 'aiready-flutter',
        programId: 'aiready',
        title: 'Google Flutter + AI Integration',
        category: 'dev',
        categoryLabel: 'Mobile App',
        programName: 'AI Ready Program',
        programYear: '3rd Year',
        modulesCount: '8 Modules',
        accentColor: 'var(--ngi-secondary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-tertiary) 0%, var(--ngi-secondary) 100%)',
        accentBg: 'var(--ngi-bg-warm-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
        ),
        description: 'Cross-platform mobile app development with Dart, Material Design, Provider state management, Firebase, and AI Chatbots.',
        highlights: [
            'Android & iOS apps from single Dart codebase',
            'Play Store & App Store production publishing'
        ],
        tags: ['Dart OOP', 'Flutter SDK', 'Provider', 'Firebase Auth', 'Play & App Store'],
        courseIndex: 1,
    },
    {
        id: 'aiready-cloud-devops',
        programId: 'aiready',
        title: 'AWS Cloud and Devops + AI Integration',
        category: 'cloud',
        categoryLabel: 'Cloud & DevOps',
        programName: 'AI Ready Program',
        programYear: '3rd Year',
        modulesCount: '5 Modules',
        accentColor: 'var(--ngi-tertiary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-secondary) 0%, var(--ngi-tertiary) 100%)',
        accentBg: 'var(--ngi-bg-warm-offwhite)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
        ),
        description: 'Hands-on enterprise cloud training covering Networking, Linux, AWS Services, Docker, Kubernetes EKS, Terraform, and Amazon Bedrock.',
        highlights: [
            'Kubernetes (EKS), Terraform & CI/CD automation',
            'GenAI on AWS (Bedrock, AgentCore, Q Developer)'
        ],
        tags: ['AWS Core (EC2/S3/VPC)', 'Docker & EKS', 'Terraform IaC', 'Amazon Bedrock AI', 'AWS Cert Prep'],
        courseIndex: 2,
    },
    {
        id: 'aiready-servicenow',
        programId: 'aiready',
        title: 'ServiceNow Platform Engineering',
        category: 'cloud',
        categoryLabel: 'Platform Eng',
        programName: 'AI Ready Program',
        programYear: '3rd Year',
        modulesCount: '15 Modules',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-secondary) 0%, var(--ngi-primary) 100%)',
        accentBg: 'var(--ngi-bg-coral-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
        description: 'Enterprise IT automation, GlideRecord scripting, Flow Designer, IntegrationHub, Now Assist AI, and CSA / CAD certification prep.',
        highlights: [
            'GlideRecord & client-server script includes',
            'CSA & CAD certification checkpoint prep'
        ],
        tags: ['Now Platform', 'GlideRecord Scripting', 'Flow Designer', 'Now Assist AI', 'CSA & CAD Prep'],
        courseIndex: 3,
    },
    */
    /* HIDDEN: Owl Coder and Moon Coder courses (their programs are hidden in
       programs-data.js). Remove this wrapper to show them again.
    {
        id: 'owl-cp-dsa',
        programId: 'owlcoder',
        title: 'Advanced Competitive Programming & DSA',
        category: 'dsa',
        categoryLabel: 'Expert CP',
        programName: 'Owl Coder',
        programYear: 'Exclusive 2028 Passouts',
        modulesCount: '21 Modules',
        accentColor: 'var(--ngi-primary)',
        accentGradient: 'var(--ngi-gradient-primary)',
        accentBg: 'var(--ngi-bg-coral-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
            </svg>
        ),
        description: 'Elite competitive programming track covering advanced trees, graphs, Tries, segment trees, DP with bitmasks, and number theory.',
        highlights: [
            'Segment Trees, Fenwick Trees & Tries',
            'String algorithms (KMP, Z-Algo) & Bitmask DP'
        ],
        tags: ['Advanced Graphs', 'Segment Trees', 'Tries & Bitmask DP', 'String Algorithms', 'Number Theory'],
        courseIndex: 0,
    },
    {
        id: 'moon-dsa-ready',
        programId: 'mooncoder',
        title: 'Core Problem Solving & DSA Readiness',
        category: 'dsa',
        categoryLabel: 'DSA Ready',
        programName: 'Moon Coder',
        programYear: 'Exclusive 2029 Passouts',
        modulesCount: '15 Modules',
        accentColor: 'var(--ngi-secondary)',
        accentGradient: 'linear-gradient(135deg, var(--ngi-tertiary) 0%, var(--ngi-secondary) 100%)',
        accentBg: 'var(--ngi-bg-warm-tint)',
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        ),
        description: 'Structured 15-module problem-solving curriculum from fundamentals through arrays, strings, recursion, hashing, and backtracking.',
        highlights: [
            'Array math, matrices & palindrome patterns',
            'Recursion state trees & basic backtracking'
        ],
        tags: ['Array Math', 'Strings & Palindromes', 'Recursion Stacks', 'HashMaps & HashSets', 'Backtracking'],
        courseIndex: 0,
    }
    */
];

// How many cards to reveal before "View More" kicks in, per viewport.
// Desktop shows everything (no collapse); mobile/tablet collapse with a
// fixed-height internal scroller.
const getLayout = (width) => {
    if (width <= 767) return { count: 3, collapsible: true };   // mobile: 1 col × 3
    if (width <= 1199) return { count: 4, collapsible: true };  // tablet: 2 cols × 2 rows
    return { count: coursesList.length, collapsible: false };   // desktop: show all
};

const Courses = () => {
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [modalCourseIndex, setModalCourseIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Reveal a sliver of the next card when expanded so it's obvious the list
    // now scrolls (a pure scrollbar isn't a strong enough cue on touch).
    const PEEK_PX = 92;

    // View More / View Less state
    const [expanded, setExpanded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(coursesList.length);
    const [collapsible, setCollapsible] = useState(false);
    const [collapsedHeight, setCollapsedHeight] = useState(null);
    const [atBottom, setAtBottom] = useState(false);
    const gridRef = useRef(null);

    // Track viewport → decide how many cards show before collapsing.
    useEffect(() => {
        const apply = () => {
            const { count, collapsible: c } = getLayout(window.innerWidth);
            setVisibleCount(count);
            setCollapsible(c);
            if (!c) setExpanded(false); // desktop is always fully expanded
        };
        apply();
        window.addEventListener('resize', apply);
        return () => window.removeEventListener('resize', apply);
    }, []);

    // Measure the exact pixel height of the first `visibleCount` cards. The grid
    // locks to this height so "View More" scrolls the remaining cards inside it
    // instead of growing the section. offsetTop/offsetHeight are layout-based
    // (scroll-independent), and the grid is position:relative so it's the offset
    // parent. Re-runs via ResizeObserver whenever the grid's width changes.
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        const measure = () => {
            const cards = grid.querySelectorAll('.ngi-course-card');
            if (!cards.length) return;
            if (visibleCount >= cards.length) { setCollapsedHeight(null); return; }
            const nth = cards[visibleCount - 1];
            const h = nth.offsetTop + nth.offsetHeight;
            setCollapsedHeight(prev => (prev == null || Math.abs(prev - h) > 1 ? h : prev));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(grid);
        return () => ro.disconnect();
    }, [visibleCount]);

    const toggleExpand = useCallback(() => {
        setExpanded(prev => {
            const next = !prev;
            if (gridRef.current) gridRef.current.scrollTop = 0; // start at the top of the scroller
            setAtBottom(false);
            return next;
        });
    }, []);

    const handleGridScroll = useCallback((e) => {
        const el = e.currentTarget;
        setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
    }, []);

    // Collapsed: exactly N cards. Expanded: N cards + a peek of the next card as
    // a scroll affordance (height only nudges by PEEK_PX, it doesn't grow to fit
    // all cards — the rest live inside the scroller).
    const gridStyle = (collapsible && collapsedHeight != null)
        ? {
            maxHeight: `${expanded ? collapsedHeight + PEEK_PX : collapsedHeight}px`,
            overflowY: expanded ? 'auto' : 'hidden',
        }
        : undefined;

    const remaining = coursesList.length - visibleCount;

    const handleOpenSyllabus = (course) => {
        const foundProgram = programsData.find(p => p.id === course.programId);
        if (foundProgram) {
            setSelectedProgram(foundProgram);
            setModalCourseIndex(course.courseIndex);
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProgram(null);
    };

    return (
        <>
            <section id="courses" className="ngi-courses">
                {/* Subtle Ambient Glow Blobs */}
                <div className="ngi-courses-glow-blob ngi-courses-glow-1" aria-hidden="true" />
                <div className="ngi-courses-glow-blob ngi-courses-glow-2" aria-hidden="true" />

                <div className="ngi-courses-container">
                    {/* Section Header */}
                    <div className="ngi-section-title" data-sal="slide-up" data-sal-delay="100" data-sal-duration="800">
                        <h2>Courses We <span>Offer</span></h2>
                        <p>
                            From C and Python foundations in the first year, through data structures, Java and industry
                            readiness, to AI engineering and placement preparation in the third.
                        </p>
                    </div>

                    {/* Courses Grid — collapses to a fixed-height scroller on mobile/tablet */}
                    <div className="ngi-courses-grid-shell">
                    <div
                        className={`ngi-courses-grid ${collapsible ? 'is-collapsible' : ''} ${expanded ? 'is-expanded' : ''}`}
                        ref={gridRef}
                        style={gridStyle}
                        onScroll={collapsible ? handleGridScroll : undefined}
                    >
                        {coursesList.map((course, idx) => (
                            <div
                                key={course.id}
                                className="ngi-course-card"
                                data-sal="slide-up"
                                data-sal-delay={`${80 + (idx % 3) * 60}`}
                                data-sal-duration="650"
                                style={{
                                    '--card-accent': course.accentColor,
                                    '--card-accent-bg': course.accentBg,
                                    '--card-gradient': course.accentGradient,
                                }}
                            >
                                {/* Top Header Bar */}
                                <div className="ngi-course-card-top">
                                    <span
                                        className="ngi-course-category-pill"
                                        style={{ color: course.accentColor, background: course.accentBg }}
                                    >
                                        {course.categoryLabel}
                                    </span>
                                </div>

                                {/* Icon + Title Area */}
                                <div className="ngi-course-card-head">
                                    <div 
                                        className="ngi-course-icon-wrapper"
                                        style={{ background: course.accentGradient }}
                                    >
                                        {course.icon}
                                    </div>
                                    <div className="ngi-course-head-text">
                                        <span className="ngi-course-program-link">
                                            {course.programName} • {course.programYear}
                                        </span>
                                        <h3 className="ngi-course-title">{course.title}</h3>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="ngi-course-desc">{course.description}</p>

                                {/* Highlights */}
                                {course.highlights && (
                                    <ul className="ngi-course-highlights-list">
                                        {course.highlights.map((item, hIdx) => (
                                            <li key={hIdx}>
                                                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="3 8 6.5 11.5 13 4" />
                                                </svg>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Tech Tags */}
                                <div className="ngi-course-tags">
                                    {course.tags.map((tag, tIdx) => (
                                        <span key={tIdx} className="ngi-course-tag-item">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Card Bottom Bar */}
                                <div className="ngi-course-card-footer">
                                    <div className="ngi-course-meta">
                                        <span className="ngi-course-meta-pill">
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                                                <path d="m2 17 10 5 10-5" />
                                                <path d="m2 12 10 5 10-5" />
                                            </svg>
                                            {course.modulesCount}
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="ngi-course-explore-btn"
                                        onClick={() => handleOpenSyllabus(course)}
                                    >
                                        Explore Syllabus <span>→</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                        {/* Bottom fade cue — signals more cards below; hides at the end */}
                        {collapsible && expanded && !atBottom && (
                            <div className="ngi-courses-scroll-fade" aria-hidden="true" />
                        )}
                    </div>

                    {/* View More / View Less toggle (mobile & tablet only) */}
                    {collapsible && (
                        <div className="ngi-courses-viewmore-wrap">
                            <button
                                type="button"
                                className="ngi-courses-viewmore-btn"
                                onClick={toggleExpand}
                                aria-expanded={expanded}
                            >
                                <span>{expanded ? 'View Less' : `View More${remaining > 0 ? ` (${remaining})` : ''}`}</span>
                                <svg
                                    className={`ngi-viewmore-chevron ${expanded ? 'is-up' : ''}`}
                                    viewBox="0 0 24 24" width="18" height="18"
                                    fill="none" stroke="currentColor" strokeWidth="2.4"
                                    strokeLinecap="round" strokeLinejoin="round"
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Reusable Program/Course Detail Modal */}
            <ProgramDetailModal
                program={selectedProgram}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialCourseIndex={modalCourseIndex}
                initialView="syllabus"
            />
        </>
    );
};

export default Courses;