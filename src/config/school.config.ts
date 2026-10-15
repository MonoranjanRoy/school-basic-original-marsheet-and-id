import type { SchoolConfig } from './types';

/**
 * ============================================================================
 *  STARTER CONTENT — copied into the database the first time the site starts.
 * ============================================================================
 *
 *  After that, the head teacher edits everything in the portal
 *  (/portal → "Website content", "Notices", "Gallery", "Faculty profiles").
 *  Changing this file later does NOT change a site that is already running.
 *
 *  • Anything inside [square brackets] is a placeholder. The portal shows how
 *    many remain and where.
 *  • Only publish information the school has confirmed. Do not list
 *    affiliations, results, awards or facilities that are not official.
 */
const config: SchoolConfig = {
  siteUrl: '', // e.g. 'https://www.yourschool.edu.in' — no trailing slash

  defaultLanguage: 'en',
  enableBengali: true,

  school: {
    name: { en: '[School Name]', bn: '[বিদ্যালয়ের নাম]' },
    shortName: '[SN]',
    tagline: { en: '[School motto or tagline]', bn: '[বিদ্যালয়ের মূলমন্ত্র]' },
    seoDescription: '[One or two sentences describing the school, its location and the classes it offers — used by search engines.]',
    logo: { src: '/images/logo.svg', alt: 'School logo' },
    established: '', // e.g. '1985'
    affiliation: '', // e.g. the exact board / affiliation wording from your official certificate
    affiliationNumber: '',
    socialShareImage: '', // e.g. '/images/social-share.jpg' (1200×630)
  },

  contact: {
    phones: [
      { label: { en: 'School office', bn: 'বিদ্যালয় অফিস' }, number: '[+91 00000 00000]' },
    ],
    email: '[office@yourschool.example]',
    whatsappNumber: '[WhatsApp number, digits only, e.g. 919800000000]',
    whatsappGreeting: {
      en: 'Hello, I would like some information about the school.',
      bn: 'নমস্কার, আমি বিদ্যালয় সম্পর্কে কিছু তথ্য জানতে চাই।',
    },
    address: ['[Street / Village]', '[Post Office, Police Station]', '[District, State — PIN]'],
    googleMapsUrl: '', // paste the "Share → Copy link" URL from Google Maps
    googleMapsEmbedUrl: '', // optional: Google Maps "Share → Embed a map" src URL
    officeHours: [
      { days: '[Monday – Friday]', hours: '[9:00 AM – 3:00 PM]' },
      { days: '[Saturday]', hours: '[9:00 AM – 12:00 PM]' },
    ],
  },

  social: {
    facebook: '',
    youtube: '',
    instagram: '',
    x: '',
  },

  theme: {
    primary: '#1d4e89',
    primaryDark: '#123459',
    accent: '#e0a526',
  },

  home: {
    heroImage: {
      src: '/images/placeholders/hero.svg',
      alt: 'Placeholder for a photograph of the school campus',
      width: 1600,
      height: 900,
    },
    heroTitle: { en: 'Welcome to [School Name]', bn: '[বিদ্যালয়ের নাম]-এ স্বাগতম' },
    heroText: '[A short welcome line for families — e.g. what makes the school special.]',
    highlights: [
      { title: '[Highlight 1]', text: '[A short, factual point about the school.]' },
      { title: '[Highlight 2]', text: '[A short, factual point about the school.]' },
      { title: '[Highlight 3]', text: '[A short, factual point about the school.]' },
    ],
    welcome: {
      heading: { en: 'A message from the Head of School', bn: 'প্রধান শিক্ষকের বার্তা' },
      paragraphs: [
        '[A short welcome message from the Principal / Head Teacher.]',
        '[A second paragraph, if needed.]',
      ],
      signatory: { name: '[Name]', role: '[Principal / Head Teacher]' },
    },
  },

  about: {
    intro: [
      '[Introduce the school: when and why it was founded, who it serves and what it values.]',
      '[A second paragraph about the school community.]',
    ],
    image: {
      src: '/images/placeholders/campus.svg',
      alt: 'Placeholder for a photograph of the school building',
      width: 1200,
      height: 800,
    },
    vision: '[The school’s vision statement.]',
    mission: '[The school’s mission statement.]',
    values: [
      { title: '[Value 1]', text: '[What this value means at the school.]' },
      { title: '[Value 2]', text: '[What this value means at the school.]' },
      { title: '[Value 3]', text: '[What this value means at the school.]' },
    ],
    history: ['[A short history of the school. Remove this paragraph if not needed.]'],
    leadershipMessage: {
      heading: { en: 'From the Managing Committee', bn: 'পরিচালন সমিতির পক্ষ থেকে' },
      paragraphs: ['[Message from the managing committee / trust. Remove this block if not needed.]'],
      person: { name: '[Name]', role: '[Secretary, Managing Committee]' },
    },
  },

  academics: {
    intro: '[Describe the school’s approach to teaching and learning.]',
    curriculum: '[Name the curriculum / board followed exactly as officially recognised.]',
    stages: [
      { name: '[Stage 1]', classes: '[Classes]', description: '[What students learn at this stage.]' },
      { name: '[Stage 2]', classes: '[Classes]', description: '[What students learn at this stage.]' },
      { name: '[Stage 3]', classes: '[Classes]', description: '[What students learn at this stage.]' },
    ],
    subjects: ['[Subject 1]', '[Subject 2]', '[Subject 3]', '[Subject 4]'],
    coCurricular: ['[Activity 1]', '[Activity 2]', '[Activity 3]'],
    timings: [
      { label: { en: 'School hours', bn: 'বিদ্যালয়ের সময়' }, value: '[e.g. 10:00 AM – 4:00 PM]' },
      { label: { en: 'Academic session', bn: 'শিক্ষাবর্ষ' }, value: '[e.g. January – December]' },
    ],
    calendarNote: '[Where parents can find the academic calendar — e.g. “Published on the Notices page at the start of each session.”]',
  },

  facilities: {
    intro: '[Introduce the school’s facilities. List only facilities that actually exist.]',
    items: [
      {
        name: '[Facility 1]',
        description: '[Describe this facility.]',
        image: { src: '/images/placeholders/facility.svg', alt: 'Placeholder for a facility photograph', width: 1200, height: 800 },
      },
      {
        name: '[Facility 2]',
        description: '[Describe this facility.]',
        image: { src: '/images/placeholders/facility.svg', alt: 'Placeholder for a facility photograph', width: 1200, height: 800 },
      },
      {
        name: '[Facility 3]',
        description: '[Describe this facility.]',
        image: { src: '/images/placeholders/facility.svg', alt: 'Placeholder for a facility photograph', width: 1200, height: 800 },
      },
    ],
  },

  faculty: {
    intro: '[Introduce the teaching staff. Publish names and photos only with each person’s consent.]',
    members: [
      { name: '[Teacher Name]', role: '[Designation]', qualification: '[Qualifications]', subjects: '[Subjects taught]' },
      { name: '[Teacher Name]', role: '[Designation]', qualification: '[Qualifications]', subjects: '[Subjects taught]' },
      { name: '[Teacher Name]', role: '[Designation]', qualification: '[Qualifications]', subjects: '[Subjects taught]' },
      { name: '[Teacher Name]', role: '[Designation]', qualification: '[Qualifications]', subjects: '[Subjects taught]' },
    ],
  },

  gallery: {
    intro: '[Photos from school life. Use only photos the school owns, and follow the school’s consent policy for photos of students.]',
    items: [
      { src: '/images/placeholders/photo-1.svg', alt: 'Placeholder photo', caption: '[Caption]', category: '[Campus]', width: 1200, height: 800 },
      { src: '/images/placeholders/photo-2.svg', alt: 'Placeholder photo', caption: '[Caption]', category: '[Events]', width: 1200, height: 800 },
      { src: '/images/placeholders/photo-3.svg', alt: 'Placeholder photo', caption: '[Caption]', category: '[Classrooms]', width: 1200, height: 800 },
      { src: '/images/placeholders/photo-1.svg', alt: 'Placeholder photo', caption: '[Caption]', category: '[Events]', width: 1200, height: 800 },
      { src: '/images/placeholders/photo-2.svg', alt: 'Placeholder photo', caption: '[Caption]', category: '[Campus]', width: 1200, height: 800 },
      { src: '/images/placeholders/photo-3.svg', alt: 'Placeholder photo', caption: '[Caption]', category: '[Classrooms]', width: 1200, height: 800 },
    ],
  },

  notices: [
    {
      id: 'sample-notice',
      date: '2026-10-12',
      title: '[Sample notice — replace or delete in school.config.ts]',
      body: '[Notice text. Add new notices to the top of this list; they are sorted by date automatically.]',
      category: '[General]',
      pinned: true,
      // attachment: { label: 'Download circular (PDF)', href: '/notices/circular.pdf' },
    },
  ],

  admissions: {
    open: true,
    session: '[2027–28]',
    intro: '[Explain who can apply, for which classes, and how families should begin.]',
    classes: [
      { value: 'level-1', label: '[Class / level 1]' },
      { value: 'level-2', label: '[Class / level 2]' },
      { value: 'level-3', label: '[Class / level 3]' },
    ],
    process: [
      { title: '[Step 1 — e.g. Send an enquiry]', text: '[Describe this step.]' },
      { title: '[Step 2]', text: '[Describe this step.]' },
      { title: '[Step 3]', text: '[Describe this step.]' },
    ],
    documents: ['[Document 1]', '[Document 2]', '[Document 3]'],
    eligibility: [{ label: '[Class]', value: '[Age / eligibility criteria]' }],
    importantDates: [{ label: '[e.g. Application forms available from]', value: '[Date]' }],
    feesNote: {
      en: 'For information about fees, please contact the school office. Fees are not collected through this website.',
      bn: 'ফি সংক্রান্ত তথ্যের জন্য অনুগ্রহ করে বিদ্যালয় অফিসে যোগাযোগ করুন। এই ওয়েবসাইটের মাধ্যমে কোনো ফি নেওয়া হয় না।',
    },
  },

  enquiryForm: {
    endpoint: '', // e.g. 'https://formspree.io/f/xxxxxxx' — empty = email/WhatsApp fallback
    extraFields: {}, // e.g. { access_key: 'your-web3forms-key' }
    emailSubject: 'Admission enquiry from the school website',
  },

  pages: {
    about: true,
    academics: true,
    facilities: true,
    faculty: true,
    gallery: true,
    notices: true,
    admissions: true,
  },

  moderation: {
    facultyPostsNeedApproval: true,
  },

  legal: {
    lastUpdated: '2026-10-12',
    operator: '',
    enquiryRetention: '[State how long the school keeps enquiry details, e.g. “until the end of the admission session they relate to”.]',
  },
};

export default config;
