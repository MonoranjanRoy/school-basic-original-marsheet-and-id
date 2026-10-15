/**
 * Shape of the central school configuration (see school.config.ts).
 *
 * Text fields accept either a plain string (used for every language) or
 * `{ en: '...', bn: '...' }`. When a Bengali value is missing the English
 * value is shown instead.
 */
export type LocalizedText = string | { en: string; bn?: string };

export type Language = 'en' | 'bn';

export interface ImageRef {
  /** Path inside /public (e.g. "/images/campus.jpg") or a full https:// URL. */
  src: string;
  /** Describe the photo for screen-reader users. Required for accessibility. */
  alt: LocalizedText;
  width?: number;
  height?: number;
}

export interface TitledText {
  title: LocalizedText;
  text: LocalizedText;
}

export interface Person {
  name: LocalizedText;
  role: LocalizedText;
  qualification?: LocalizedText;
  subjects?: LocalizedText;
  /** Optional photo. Without one, the person's initials are shown. */
  photo?: ImageRef;
}

export interface Notice {
  /** Unique, URL-friendly id, e.g. "2026-annual-sports". */
  id: string;
  /** ISO date: YYYY-MM-DD */
  date: string;
  title: LocalizedText;
  body: LocalizedText;
  category?: LocalizedText;
  /** Pinned notices are listed first and highlighted. */
  pinned?: boolean;
  /** Optional downloadable file placed in /public/notices/. */
  attachment?: { label: LocalizedText; href: string };
}

/** Pages the head teacher can show or hide (Home, Contact and legal pages are always shown). */
export const HIDEABLE_PAGES = ['about', 'academics', 'facilities', 'faculty', 'gallery', 'notices', 'admissions'] as const;
export type HideablePage = (typeof HIDEABLE_PAGES)[number];

export interface SchoolConfig {
  /**
   * Public address of the website, without a trailing slash,
   * e.g. "https://www.yourschool.edu.in". Used for canonical URLs,
   * the sitemap and social-media previews. Leave empty until you have a domain.
   */
  siteUrl: string;

  /** Language shown to first-time visitors. */
  defaultLanguage: Language;
  /** Show the English / বাংলা language switch. */
  enableBengali: boolean;

  school: {
    name: LocalizedText;
    /** Short name for small screens, e.g. initials. */
    shortName: LocalizedText;
    tagline: LocalizedText;
    /** One or two sentences used for search engines and link previews. */
    seoDescription: LocalizedText;
    logo: ImageRef;
    /** Year founded. Leave empty to hide. */
    established?: string;
    /** Board / affiliation exactly as officially granted. Leave empty to hide. */
    affiliation?: LocalizedText;
    /** Official registration / affiliation number. Leave empty to hide. */
    affiliationNumber?: string;
    /** 1200×630 JPG/PNG used when links are shared on social media. Optional. */
    socialShareImage?: string;
  };

  contact: {
    phones: { label: LocalizedText; number: string }[];
    email: string;
    /** WhatsApp number in international format, digits only, e.g. "919800000000". Empty hides the button. */
    whatsappNumber: string;
    whatsappGreeting: LocalizedText;
    address: LocalizedText[];
    /** Google Maps share link for the school. If empty, a search link is built from the address. */
    googleMapsUrl?: string;
    /** Optional Google Maps "Embed a map" src URL. Empty = no embedded map (link only). */
    googleMapsEmbedUrl?: string;
    officeHours: { days: LocalizedText; hours: LocalizedText }[];
  };

  social: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    x?: string;
  };

  theme: {
    /** Main brand colour (header, buttons). Keep it dark enough for white text. */
    primary: string;
    primaryDark: string;
    /** Highlight colour (badges, accents). */
    accent: string;
  };

  home: {
    heroImage: ImageRef;
    heroTitle: LocalizedText;
    heroText: LocalizedText;
    highlights: TitledText[];
    welcome: {
      heading: LocalizedText;
      paragraphs: LocalizedText[];
      signatory?: Person;
    };
  };

  about: {
    intro: LocalizedText[];
    image?: ImageRef;
    vision: LocalizedText;
    mission: LocalizedText;
    values: TitledText[];
    history: LocalizedText[];
    leadershipMessage?: {
      heading: LocalizedText;
      paragraphs: LocalizedText[];
      person: Person;
    };
  };

  academics: {
    intro: LocalizedText;
    curriculum: LocalizedText;
    stages: { name: LocalizedText; classes: LocalizedText; description: LocalizedText }[];
    subjects: LocalizedText[];
    coCurricular: LocalizedText[];
    timings: { label: LocalizedText; value: LocalizedText }[];
    calendarNote: LocalizedText;
  };

  facilities: {
    intro: LocalizedText;
    items: { name: LocalizedText; description: LocalizedText; image?: ImageRef }[];
  };

  faculty: {
    intro: LocalizedText;
    members: Person[];
  };

  gallery: {
    intro: LocalizedText;
    items: (ImageRef & { caption?: LocalizedText; category?: LocalizedText })[];
  };

  notices: Notice[];

  admissions: {
    /** Shows an "Admissions open" banner on the home page when true. */
    open: boolean;
    session: LocalizedText;
    intro: LocalizedText;
    /** Options for the "Class of interest" field in the enquiry form. */
    classes: { value: string; label: LocalizedText }[];
    process: TitledText[];
    documents: LocalizedText[];
    eligibility: { label: LocalizedText; value: LocalizedText }[];
    importantDates: { label: LocalizedText; value: LocalizedText }[];
    /** Information only — this website never collects fees. */
    feesNote: LocalizedText;
  };

  /**
   * Where the admission enquiry form sends its data.
   * See README → "Admission enquiry form" for set-up steps.
   */
  enquiryForm: {
    /**
     * POST endpoint of a form service (Formspree, Web3Forms, Getform, Basin…)
     * or an existing school endpoint. Must accept form data and return a 2xx
     * status on success. Leave empty to use the email / WhatsApp fallback.
     */
    endpoint: string;
    /** Extra hidden fields some services require, e.g. { access_key: '...' } for Web3Forms. */
    extraFields: Record<string, string>;
    /** Subject line of enquiry emails. */
    emailSubject: string;
  };

  /** Show (true) or hide (false) each optional page in the menu and on the site. */
  pages: Record<HideablePage, boolean>;

  moderation: {
    /** When true, notices and photos posted by faculty appear only after the head teacher approves them. */
    facultyPostsNeedApproval: boolean;
  };

  legal: {
    /** ISO date shown as "Last updated" on the Privacy Policy and Terms pages. */
    lastUpdated: string;
    /** Legal entity that runs the school (e.g. the trust or society). Empty = school name. */
    operator?: LocalizedText;
    /** How long the school keeps enquiry details — the school must decide this. */
    enquiryRetention: LocalizedText;
  };
}
