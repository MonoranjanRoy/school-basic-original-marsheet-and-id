/**
 * Fixed interface text (menus, buttons, form labels). School-specific content
 * lives in src/config/school.config.ts instead.
 *
 * Bengali translations should be reviewed by a fluent speaker at the school
 * before publishing.
 */
const en = {
  skipToContent: 'Skip to main content',
  menu: 'Menu',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  mainNav: 'Main navigation',
  footerNav: 'Footer',
  switchLanguage: 'Switch language to',
  languageName: 'English',
  opensNewTab: '(opens in a new tab)',

  nav: {
    home: 'Home',
    about: 'About Us',
    academics: 'Academics',
    facilities: 'Facilities',
    faculty: 'Faculty',
    gallery: 'Gallery',
    notices: 'Notices',
    admissions: 'Admissions',
    contact: 'Contact',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    portal: 'Staff login',
    studentLogin: 'Student login',
    results: 'Check result',
  },

  pageIntro: {
    about: 'Our story, vision and values.',
    academics: 'Curriculum, classes and the school day.',
    facilities: 'Spaces and resources for learning.',
    faculty: 'The teachers and staff who guide our students.',
    gallery: 'Moments from school life.',
    notices: 'Announcements and circulars for parents and students.',
    admissions: 'How to apply, and how to send us an enquiry.',
    contact: 'Visit, call or write to us.',
    privacy: 'How this website handles your information.',
    terms: 'The terms that apply when you use this website.',
    results: 'Enter the ID card number and date of birth to see the marksheet.',
  },

  cta: {
    enquire: 'Admission enquiry',
    enquireNow: 'Enquire now',
    contactUs: 'Contact us',
    learnMore: 'Learn more',
    viewAll: 'View all',
    viewAllNotices: 'View all notices',
    viewGallery: 'View gallery',
    getDirections: 'Get directions',
    openInMaps: 'Open in Google Maps',
    chatOnWhatsApp: 'Chat on WhatsApp',
    call: 'Call',
    email: 'Email',
    backHome: 'Back to home',
  },

  home: {
    admissionsOpen: 'Admissions open',
    forSession: 'for session',
    explore: 'Explore the school',
    latestNotices: 'Latest notices',
    galleryPreview: 'From our gallery',
    visitUs: 'Visit us',
    established: 'Established',
  },

  about: {
    vision: 'Our vision',
    mission: 'Our mission',
    values: 'Our values',
    history: 'Our history',
  },

  academics: {
    curriculum: 'Curriculum',
    stages: 'Classes and stages',
    subjects: 'Subjects',
    coCurricular: 'Beyond the classroom',
    timings: 'School timings',
    calendar: 'Academic calendar',
  },

  faculty: {
    qualification: 'Qualification',
    subjects: 'Subjects',
  },

  gallery: {
    all: 'All',
    filterLabel: 'Filter photos by category',
    openPhoto: 'Open photo',
    close: 'Close',
    previous: 'Previous photo',
    next: 'Next photo',
    photoOf: 'Photo {n} of {total}',
    empty: 'No photos have been added yet.',
  },

  notices: {
    none: 'There are no notices at the moment.',
    pinned: 'Important',
    download: 'Download',
    postedOn: 'Posted on',
  },

  admissions: {
    session: 'Admission session',
    status: 'Status',
    open: 'Open',
    closed: 'Closed',
    closedNote: 'Admissions are currently closed. You are welcome to send an enquiry and we will contact you when admissions open.',
    process: 'Admission process',
    documents: 'Documents required',
    eligibility: 'Eligibility',
    dates: 'Important dates',
    fees: 'Fees',
    enquiryHeading: 'Admission enquiry form',
    enquiryIntro: 'Send us your details and the school office will get back to you. Submitting this form is an enquiry only — it does not register or admit a student.',
  },

  form: {
    parentName: 'Parent / guardian name',
    studentName: 'Student’s name',
    classOfInterest: 'Class of interest',
    selectClass: 'Select a class',
    phone: 'Contact number',
    phoneHint: 'Include the country code if outside India, e.g. +880…',
    email: 'Email',
    message: 'Message',
    optional: 'optional',
    required: 'required',
    consent: 'I agree that the school may use these details to respond to my enquiry, as described in the',
    submit: 'Send enquiry',
    submitting: 'Sending…',
    errorsHeading: 'Please correct the following:',
    errors: {
      parentName: 'Enter the parent or guardian’s name.',
      studentName: 'Enter the student’s name.',
      classOfInterest: 'Select a class.',
      phone: 'Enter a valid contact number (7–15 digits).',
      email: 'Enter a valid email address, or leave it empty.',
      message: 'Message is too long (maximum 1000 characters).',
      consent: 'Please confirm that the school may use these details to reply.',
    },
    success: 'Thank you. Your enquiry has been sent to the school office. We will contact you soon.',
    failure: 'Sorry — your enquiry could not be sent. Nothing was delivered. Please try again, or contact the school directly:',
    offline: 'You appear to be offline. Your enquiry has not been sent. Please check your connection and try again.',
    fallbackIntro: 'Online form delivery is not set up yet. Fill in the form and choose how to send it — your email or WhatsApp app will open with your enquiry ready to send.',
    fallbackEmail: 'Send by email',
    fallbackWhatsApp: 'Send on WhatsApp',
    fallbackOpened: 'Your {app} app should now be open with your enquiry filled in. The enquiry has NOT been sent yet — please press Send in that app to deliver it.',
    fallbackNone: 'Online enquiries are not available yet. Please contact the school office directly:',
    sendAnother: 'Send another enquiry',
  },

  contact: {
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    officeHours: 'Office hours',
    map: 'Location map',
    mapNote: 'The map is provided by Google Maps.',
    followUs: 'Follow us',
    getInTouch: 'Get in touch',
    enquiryPrompt: 'Looking for admission information?',
    toBeAdded: 'To be added',
  },

  legal: {
    lastUpdated: 'Last updated',
  },

  notFound: {
    title: 'Page not found',
    text: 'Sorry, the page you are looking for does not exist or has moved.',
  },

  footer: {
    quickLinks: 'Quick links',
    information: 'Information',
    rights: 'All rights reserved.',
  },

  resultCheck: {
    studentId: 'Student ID (as on the ID card)',
    studentIdHint: 'For example 2026-045',
    dob: 'Date of birth',
    submit: 'Show result',
    checking: 'Checking…',
    missing: 'Enter the student ID and date of birth.',
    none: 'No results have been published for this student yet. Please check again later.',
    print: 'Print / save as PDF',
    another: 'Check another result',
    privacy: 'Only results the school has published are shown. Keep your ID card number and date of birth private.',
  },

  offlineBanner: 'The website server is not running, so starter content is shown and the portal will not work. Start everything with: npm run dev',
  setupBanner: 'Setup reminder (shown only in development): {n} placeholder texts remain. Replace them in the portal under “Website content”.',
};

export type Strings = typeof en;

const bn: Strings = {
  skipToContent: 'মূল বিষয়বস্তুতে যান',
  menu: 'মেনু',
  openMenu: 'মেনু খুলুন',
  closeMenu: 'মেনু বন্ধ করুন',
  mainNav: 'প্রধান নেভিগেশন',
  footerNav: 'ফুটার',
  switchLanguage: 'ভাষা পরিবর্তন করুন:',
  languageName: 'বাংলা',
  opensNewTab: '(নতুন ট্যাবে খুলবে)',

  nav: {
    home: 'হোম',
    about: 'আমাদের কথা',
    academics: 'পঠনপাঠন',
    facilities: 'সুযোগ-সুবিধা',
    faculty: 'শিক্ষকমণ্ডলী',
    gallery: 'ছবির গ্যালারি',
    notices: 'বিজ্ঞপ্তি',
    admissions: 'ভর্তি',
    contact: 'যোগাযোগ',
    privacy: 'গোপনীয়তা নীতি',
    terms: 'ব্যবহারের শর্তাবলি',
    portal: 'শিক্ষক-কর্মী লগইন',
    studentLogin: 'ছাত্রছাত্রী লগইন',
    results: 'ফলাফল দেখুন',
  },

  pageIntro: {
    about: 'আমাদের ইতিহাস, লক্ষ্য ও মূল্যবোধ।',
    academics: 'পাঠ্যক্রম, শ্রেণি এবং বিদ্যালয়ের দিনলিপি।',
    facilities: 'শেখার জন্য পরিবেশ ও উপকরণ।',
    faculty: 'যে শিক্ষক-শিক্ষিকা ও কর্মীরা আমাদের ছাত্রছাত্রীদের পথ দেখান।',
    gallery: 'বিদ্যালয় জীবনের কিছু মুহূর্ত।',
    notices: 'অভিভাবক ও ছাত্রছাত্রীদের জন্য ঘোষণা ও বিজ্ঞপ্তি।',
    admissions: 'কীভাবে আবেদন করবেন এবং কীভাবে আমাদের কাছে জানতে চাইবেন।',
    contact: 'আসুন, ফোন করুন বা লিখুন।',
    privacy: 'এই ওয়েবসাইট আপনার তথ্য কীভাবে ব্যবহার করে।',
    terms: 'এই ওয়েবসাইট ব্যবহারের শর্তাবলি।',
    results: 'মার্কশিট দেখতে আইডি কার্ড নম্বর ও জন্ম তারিখ লিখুন।',
  },

  cta: {
    enquire: 'ভর্তি সংক্রান্ত জিজ্ঞাসা',
    enquireNow: 'জিজ্ঞাসা করুন',
    contactUs: 'যোগাযোগ করুন',
    learnMore: 'আরও জানুন',
    viewAll: 'সব দেখুন',
    viewAllNotices: 'সব বিজ্ঞপ্তি দেখুন',
    viewGallery: 'গ্যালারি দেখুন',
    getDirections: 'পথনির্দেশ',
    openInMaps: 'গুগল ম্যাপে খুলুন',
    chatOnWhatsApp: 'হোয়াটসঅ্যাপে কথা বলুন',
    call: 'ফোন করুন',
    email: 'ইমেল',
    backHome: 'হোম পেজে ফিরুন',
  },

  home: {
    admissionsOpen: 'ভর্তি চলছে',
    forSession: 'শিক্ষাবর্ষ',
    explore: 'বিদ্যালয়কে জানুন',
    latestNotices: 'সাম্প্রতিক বিজ্ঞপ্তি',
    galleryPreview: 'আমাদের গ্যালারি থেকে',
    visitUs: 'আমাদের ঠিকানা',
    established: 'প্রতিষ্ঠা',
  },

  about: {
    vision: 'আমাদের লক্ষ্য',
    mission: 'আমাদের উদ্দেশ্য',
    values: 'আমাদের মূল্যবোধ',
    history: 'আমাদের ইতিহাস',
  },

  academics: {
    curriculum: 'পাঠ্যক্রম',
    stages: 'শ্রেণি ও স্তর',
    subjects: 'বিষয়সমূহ',
    coCurricular: 'শ্রেণিকক্ষের বাইরে',
    timings: 'বিদ্যালয়ের সময়সূচি',
    calendar: 'শিক্ষাবর্ষের ক্যালেন্ডার',
  },

  faculty: {
    qualification: 'শিক্ষাগত যোগ্যতা',
    subjects: 'বিষয়',
  },

  gallery: {
    all: 'সব',
    filterLabel: 'বিভাগ অনুযায়ী ছবি দেখুন',
    openPhoto: 'ছবি খুলুন',
    close: 'বন্ধ করুন',
    previous: 'আগের ছবি',
    next: 'পরের ছবি',
    photoOf: 'ছবি {n} / {total}',
    empty: 'এখনও কোনো ছবি যোগ করা হয়নি।',
  },

  notices: {
    none: 'এই মুহূর্তে কোনো বিজ্ঞপ্তি নেই।',
    pinned: 'গুরুত্বপূর্ণ',
    download: 'ডাউনলোড',
    postedOn: 'প্রকাশের তারিখ',
  },

  admissions: {
    session: 'ভর্তির শিক্ষাবর্ষ',
    status: 'অবস্থা',
    open: 'চলছে',
    closed: 'বন্ধ',
    closedNote: 'এই মুহূর্তে ভর্তি বন্ধ আছে। আপনি জিজ্ঞাসা পাঠাতে পারেন; ভর্তি শুরু হলে আমরা আপনার সঙ্গে যোগাযোগ করব।',
    process: 'ভর্তি প্রক্রিয়া',
    documents: 'প্রয়োজনীয় নথিপত্র',
    eligibility: 'যোগ্যতা',
    dates: 'গুরুত্বপূর্ণ তারিখ',
    fees: 'ফি',
    enquiryHeading: 'ভর্তি সংক্রান্ত জিজ্ঞাসার ফর্ম',
    enquiryIntro: 'আপনার তথ্য পাঠান, বিদ্যালয় অফিস আপনার সঙ্গে যোগাযোগ করবে। এই ফর্ম কেবল একটি জিজ্ঞাসা — এর মাধ্যমে কোনো ছাত্রছাত্রীর নাম নথিভুক্ত বা ভর্তি হয় না।',
  },

  form: {
    parentName: 'অভিভাবকের নাম',
    studentName: 'ছাত্র/ছাত্রীর নাম',
    classOfInterest: 'কোন শ্রেণিতে ভর্তি',
    selectClass: 'শ্রেণি বেছে নিন',
    phone: 'যোগাযোগের নম্বর',
    phoneHint: 'ভারতের বাইরে হলে দেশের কোড দিন, যেমন +880…',
    email: 'ইমেল',
    message: 'বার্তা',
    optional: 'ঐচ্ছিক',
    required: 'আবশ্যক',
    consent: 'আমি সম্মতি দিচ্ছি যে বিদ্যালয় আমার জিজ্ঞাসার উত্তর দিতে এই তথ্য ব্যবহার করতে পারে, যেমনটি বলা আছে',
    submit: 'জিজ্ঞাসা পাঠান',
    submitting: 'পাঠানো হচ্ছে…',
    errorsHeading: 'অনুগ্রহ করে নিচের বিষয়গুলি ঠিক করুন:',
    errors: {
      parentName: 'অভিভাবকের নাম লিখুন।',
      studentName: 'ছাত্র/ছাত্রীর নাম লিখুন।',
      classOfInterest: 'একটি শ্রেণি বেছে নিন।',
      phone: 'একটি সঠিক যোগাযোগ নম্বর দিন (৭–১৫ অঙ্ক)।',
      email: 'সঠিক ইমেল ঠিকানা দিন, অথবা ঘরটি ফাঁকা রাখুন।',
      message: 'বার্তাটি খুব বড় (সর্বোচ্চ ১০০০ অক্ষর)।',
      consent: 'অনুগ্রহ করে সম্মতি দিন যাতে বিদ্যালয় এই তথ্য ব্যবহার করে উত্তর দিতে পারে।',
    },
    success: 'ধন্যবাদ। আপনার জিজ্ঞাসা বিদ্যালয় অফিসে পাঠানো হয়েছে। আমরা শীঘ্রই আপনার সঙ্গে যোগাযোগ করব।',
    failure: 'দুঃখিত — আপনার জিজ্ঞাসা পাঠানো যায়নি। কিছুই পৌঁছায়নি। আবার চেষ্টা করুন, অথবা সরাসরি বিদ্যালয়ে যোগাযোগ করুন:',
    offline: 'আপনি সম্ভবত অফলাইনে আছেন। আপনার জিজ্ঞাসা পাঠানো হয়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
    fallbackIntro: 'অনলাইনে ফর্ম পাঠানোর ব্যবস্থা এখনও চালু হয়নি। ফর্মটি পূরণ করে পাঠানোর মাধ্যম বেছে নিন — আপনার ইমেল বা হোয়াটসঅ্যাপ অ্যাপে জিজ্ঞাসাটি তৈরি অবস্থায় খুলবে।',
    fallbackEmail: 'ইমেলে পাঠান',
    fallbackWhatsApp: 'হোয়াটসঅ্যাপে পাঠান',
    fallbackOpened: 'আপনার {app} অ্যাপে জিজ্ঞাসাটি তৈরি অবস্থায় খোলার কথা। জিজ্ঞাসাটি এখনও পাঠানো হয়নি — পাঠাতে ওই অ্যাপে Send চাপুন।',
    fallbackNone: 'অনলাইন জিজ্ঞাসার ব্যবস্থা এখনও চালু হয়নি। অনুগ্রহ করে সরাসরি বিদ্যালয় অফিসে যোগাযোগ করুন:',
    sendAnother: 'আরেকটি জিজ্ঞাসা পাঠান',
  },

  contact: {
    address: 'ঠিকানা',
    phone: 'ফোন',
    email: 'ইমেল',
    whatsapp: 'হোয়াটসঅ্যাপ',
    officeHours: 'অফিসের সময়',
    map: 'অবস্থানের মানচিত্র',
    mapNote: 'মানচিত্রটি গুগল ম্যাপস থেকে নেওয়া।',
    followUs: 'আমাদের অনুসরণ করুন',
    getInTouch: 'যোগাযোগ করুন',
    enquiryPrompt: 'ভর্তি সংক্রান্ত তথ্য খুঁজছেন?',
    toBeAdded: 'শীঘ্রই যোগ করা হবে',
  },

  legal: {
    lastUpdated: 'সর্বশেষ হালনাগাদ',
  },

  notFound: {
    title: 'পৃষ্ঠাটি পাওয়া যায়নি',
    text: 'দুঃখিত, আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি নেই বা সরিয়ে নেওয়া হয়েছে।',
  },

  footer: {
    quickLinks: 'দ্রুত লিংক',
    information: 'তথ্য',
    rights: 'সর্বস্বত্ব সংরক্ষিত।',
  },

  resultCheck: {
    studentId: 'ছাত্র/ছাত্রীর আইডি (আইডি কার্ডে যেমন আছে)',
    studentIdHint: 'যেমন 2026-045',
    dob: 'জন্ম তারিখ',
    submit: 'ফলাফল দেখুন',
    checking: 'দেখা হচ্ছে…',
    missing: 'আইডি এবং জন্ম তারিখ লিখুন।',
    none: 'এই ছাত্র/ছাত্রীর কোনো ফলাফল এখনও প্রকাশিত হয়নি। পরে আবার দেখুন।',
    print: 'প্রিন্ট / PDF হিসেবে সেভ করুন',
    another: 'অন্য ফলাফল দেখুন',
    privacy: 'বিদ্যালয় যে ফলাফল প্রকাশ করেছে কেবল সেগুলিই দেখানো হয়। আইডি কার্ড নম্বর ও জন্ম তারিখ অন্যকে জানাবেন না।',
  },

  offlineBanner: 'ওয়েবসাইটের সার্ভার চালু নেই, তাই প্রাথমিক বিষয়বস্তু দেখানো হচ্ছে এবং পোর্টাল কাজ করবে না। সব চালু করতে: npm run dev',
  setupBanner: 'সেটআপ রিমাইন্ডার (কেবল ডেভেলপমেন্টে দেখা যায়): এখনও {n}টি প্লেসহোল্ডার আছে। পোর্টালের “Website content” অংশে সেগুলি বদলান।',
};

export const strings: Record<'en' | 'bn', Strings> = { en, bn };
