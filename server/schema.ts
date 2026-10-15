/**
 * Validation for everything the portal can save. Unknown fields are dropped;
 * URLs are restricted to safe schemes so saved content can never inject
 * `javascript:` links or load images/frames from unexpected places.
 */
import { z } from 'zod';

const MAX_SHORT = 300;
const MAX_LONG = 5000;

const text = (max = MAX_SHORT) => z.string().max(max);
export const localized = (max = MAX_SHORT) =>
  z.union([text(max), z.object({ en: text(max), bn: text(max).optional() })]);

const httpsUrl = z.string().max(1000).regex(/^https:\/\/[^\s"'<>]+$/, 'Must be an https:// link');
const optionalHttps = z.union([z.literal(''), httpsUrl]);
export const imageSrc = z
  .string()
  .max(1000)
  .regex(/^(\/(media|images)\/[\w./-]+|https:\/\/[^\s"'<>]+)$/, 'Must be an uploaded image or an https:// link');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #1d4e89');
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const imageRef = z.object({
  src: imageSrc,
  alt: localized(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
});

const titled = z.object({ title: localized(), text: localized(MAX_LONG) });
const person = z.object({
  name: localized(),
  role: localized(),
  qualification: localized().optional(),
  subjects: localized().optional(),
  photo: imageRef.optional(),
});
const labelValue = z.object({ label: localized(), value: localized() });
const list = <T extends z.ZodTypeAny>(item: T, max = 50) => z.array(item).max(max);

export const siteSettingsSchema = z.object({
  siteUrl: z.union([z.literal(''), z.string().max(300).regex(/^https?:\/\/[^\s"'<>/]+(\/[^\s"'<>]*)?$/)]),
  defaultLanguage: z.enum(['en', 'bn']),
  enableBengali: z.boolean(),
  school: z.object({
    name: localized(),
    shortName: localized(),
    tagline: localized(),
    seoDescription: localized(1000),
    logo: imageRef,
    established: text(20).optional(),
    affiliation: localized().optional(),
    affiliationNumber: text(100).optional(),
    socialShareImage: z.union([z.literal(''), imageSrc]).optional(),
  }),
  contact: z.object({
    phones: list(z.object({ label: localized(), number: text(40) }), 10),
    email: text(200),
    whatsappNumber: text(60),
    whatsappGreeting: localized(),
    address: list(localized(), 8),
    googleMapsUrl: optionalHttps.optional(),
    googleMapsEmbedUrl: z
      .union([z.literal(''), z.string().max(2000).regex(/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed[^\s"'<>]*$/, 'Must be a Google Maps embed link')])
      .optional(),
    officeHours: list(z.object({ days: localized(), hours: localized() }), 10),
  }),
  social: z.object({
    facebook: optionalHttps.optional(),
    youtube: optionalHttps.optional(),
    instagram: optionalHttps.optional(),
    x: optionalHttps.optional(),
  }),
  theme: z.object({ primary: color, primaryDark: color, accent: color }),
  home: z.object({
    heroImage: imageRef,
    heroTitle: localized(),
    heroText: localized(1000),
    highlights: list(titled, 12),
    welcome: z.object({
      heading: localized(),
      paragraphs: list(localized(MAX_LONG), 10),
      signatory: person.optional(),
    }),
  }),
  about: z.object({
    intro: list(localized(MAX_LONG), 10),
    image: imageRef.optional(),
    vision: localized(MAX_LONG),
    mission: localized(MAX_LONG),
    values: list(titled, 12),
    history: list(localized(MAX_LONG), 10),
    leadershipMessage: z
      .object({ heading: localized(), paragraphs: list(localized(MAX_LONG), 10), person })
      .optional(),
  }),
  academics: z.object({
    intro: localized(MAX_LONG),
    curriculum: localized(MAX_LONG),
    stages: list(z.object({ name: localized(), classes: localized(), description: localized(MAX_LONG) }), 12),
    subjects: list(localized(), 40),
    coCurricular: list(localized(), 40),
    timings: list(labelValue, 12),
    calendarNote: localized(MAX_LONG),
  }),
  facilities: z.object({
    intro: localized(MAX_LONG),
    items: list(z.object({ name: localized(), description: localized(MAX_LONG), image: imageRef.optional() }), 40),
  }),
  faculty: z.object({ intro: localized(MAX_LONG) }),
  gallery: z.object({ intro: localized(MAX_LONG) }),
  admissions: z.object({
    open: z.boolean(),
    session: localized(),
    intro: localized(MAX_LONG),
    classes: list(z.object({ value: text(60).regex(/^[\w-]+$/, 'Letters, numbers and dashes only'), label: localized() }), 40),
    process: list(titled, 12),
    documents: list(localized(), 30),
    eligibility: list(labelValue, 30),
    importantDates: list(labelValue, 30),
    feesNote: localized(MAX_LONG),
  }),
  enquiryForm: z.object({
    endpoint: optionalHttps,
    extraFields: z.record(z.string().max(60), z.string().max(300)),
    emailSubject: text(200),
  }),
  pages: z.object({
    about: z.boolean(),
    academics: z.boolean(),
    facilities: z.boolean(),
    faculty: z.boolean(),
    gallery: z.boolean(),
    notices: z.boolean(),
    admissions: z.boolean(),
  }),
  moderation: z.object({ facultyPostsNeedApproval: z.boolean() }),
  legal: z.object({
    lastUpdated: isoDate,
    operator: localized().optional(),
    enquiryRetention: localized(1000),
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const noticeInput = z.object({
  date: isoDate,
  title: localized(),
  body: localized(MAX_LONG),
  category: localized().optional(),
  pinned: z.boolean().default(false),
  audience: z.enum(['public', 'students', 'staff']),
  attachmentMediaId: z.uuid().nullable().optional(),
  attachmentLabel: localized().optional(),
});

export const galleryInput = z.object({
  mediaId: z.uuid(),
  alt: localized(),
  caption: localized().optional(),
  category: localized().optional(),
  sort: z.number().int().min(-10000).max(10000).default(0),
});

export const facultyInput = z.object({
  name: localized(),
  role: localized(),
  qualification: localized().optional(),
  subjects: localized().optional(),
  photoMediaId: z.uuid().nullable().optional(),
  userId: z.uuid().nullable().optional(),
  sort: z.number().int().min(-10000).max(10000).default(0),
});

/** Fields a teacher may change on their own profile. */
export const ownProfileInput = facultyInput.pick({ name: true, qualification: true, subjects: true, photoMediaId: true });

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(40)
  .regex(/^[a-z0-9._-]+$/, 'Use only letters, numbers, dots, dashes and underscores');

export const studentId = z
  .string()
  .trim()
  .min(1, 'Enter the student ID')
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9/._-]*$/, 'Student ID: use letters, numbers, / . _ - only');

/** A real calendar date between 1950 and today. */
export const dateOfBirth = isoDate.refine((d) => {
  const date = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === d && d >= '1950-01-01' && date <= new Date();
}, 'Enter a valid date of birth');

const displayName = z.string().trim().min(1).max(100);

/** Staff sign in with username + password; students with student ID + date of birth. */
export const userCreateInput = z.discriminatedUnion('role', [
  z.object({ role: z.enum(['head_teacher', 'faculty']), username, displayName }),
  z.object({ role: z.literal('student'), studentId, dateOfBirth, displayName }),
]);

export const userUpdateInput = z.object({
  displayName: displayName.optional(),
  // Staff can move between staff roles; students stay students (they have no password).
  role: z.enum(['head_teacher', 'faculty']).optional(),
  active: z.boolean().optional(),
  studentId: studentId.optional(),
  dateOfBirth: dateOfBirth.optional(),
});
