/**
 * Describes every field the head teacher can edit in "Website content".
 * The editor (components/FieldEditor.tsx) renders forms from this list.
 * To make a new config field editable, add it here.
 */
export type Field =
  | { type: 'text'; key: string; label: string; help?: string; multiline?: boolean }
  | { type: 'ltext'; key: string; label: string; help?: string; multiline?: boolean }
  | { type: 'bool'; key: string; label: string; help?: string }
  | { type: 'color'; key: string; label: string; help?: string }
  | { type: 'date'; key: string; label: string; help?: string }
  | { type: 'select'; key: string; label: string; options: { value: string; label: string }[]; help?: string }
  | { type: 'image'; key: string; label: string; help?: string; optional?: boolean }
  | { type: 'group'; key: string; label: string; fields: Field[]; help?: string; optional?: boolean }
  | { type: 'list'; key: string; label: string; item: Field; itemLabel: string; help?: string }
  | { type: 'keyvalue'; key: string; label: string; help?: string };

export interface Section {
  id: string;
  title: string;
  intro: string;
  fields: Field[];
}

const ltext = (key: string, label: string, extra: Partial<{ help: string; multiline: boolean }> = {}): Field => ({ type: 'ltext', key, label, ...extra });
const titled = (itemLabel: string): Field => ({
  type: 'group',
  key: '',
  label: itemLabel,
  fields: [ltext('title', 'Title'), ltext('text', 'Text', { multiline: true })],
});
const labelValue = (itemLabel: string, labelName = 'Label', valueName = 'Value'): Field => ({
  type: 'group',
  key: '',
  label: itemLabel,
  fields: [ltext('label', labelName), ltext('value', valueName)],
});
const person = (key: string, label: string, optional = false): Field => ({
  type: 'group',
  key,
  label,
  optional,
  fields: [
    ltext('name', 'Name'),
    ltext('role', 'Designation'),
    { type: 'image', key: 'photo', label: 'Photo', optional: true },
  ],
});
const paragraphs = (key: string, label: string): Field => ({
  type: 'list',
  key,
  label,
  itemLabel: 'Paragraph',
  item: { type: 'ltext', key: '', label: 'Paragraph', multiline: true },
});

export const SECTIONS: Section[] = [
  {
    id: 'school',
    title: 'School & branding',
    intro: 'Name, logo, colours and languages.',
    fields: [
      ltext('school.name', 'School name'),
      ltext('school.shortName', 'Short name', { help: 'Initials or a short form.' }),
      ltext('school.tagline', 'Motto / tagline'),
      ltext('school.seoDescription', 'Description for search engines', { multiline: true, help: 'One or two sentences shown in Google results.' }),
      { type: 'image', key: 'school.logo', label: 'Logo', help: 'Shown in the header, footer and browser tab. A square image works best.' },
      { type: 'text', key: 'school.established', label: 'Year established', help: 'Leave empty to hide.' },
      ltext('school.affiliation', 'Board / affiliation', { help: 'Exactly as on the official certificate. Leave empty to hide.' }),
      { type: 'text', key: 'school.affiliationNumber', label: 'Affiliation / registration number' },
      { type: 'text', key: 'siteUrl', label: 'Website address', help: 'e.g. https://www.yourschool.edu.in — used for search engines and link previews.' },
      {
        type: 'select',
        key: 'defaultLanguage',
        label: 'Default language',
        options: [
          { value: 'en', label: 'English' },
          { value: 'bn', label: 'বাংলা (Bengali)' },
        ],
      },
      { type: 'bool', key: 'enableBengali', label: 'Show the English / বাংলা language switch' },
      { type: 'color', key: 'theme.primary', label: 'Main colour', help: 'Header, buttons. Must be dark enough for white text.' },
      { type: 'color', key: 'theme.primaryDark', label: 'Dark colour' },
      { type: 'color', key: 'theme.accent', label: 'Highlight colour' },
    ],
  },
  {
    id: 'pages',
    title: 'Pages & approval',
    intro: 'Choose which pages appear on the website, and whether teachers’ posts need your approval.',
    fields: [
      { type: 'bool', key: 'pages.about', label: 'About Us page' },
      { type: 'bool', key: 'pages.academics', label: 'Academics page' },
      { type: 'bool', key: 'pages.facilities', label: 'Facilities page' },
      { type: 'bool', key: 'pages.faculty', label: 'Faculty page' },
      { type: 'bool', key: 'pages.gallery', label: 'Gallery page' },
      { type: 'bool', key: 'pages.notices', label: 'Notices page' },
      { type: 'bool', key: 'pages.admissions', label: 'Admissions page (with the enquiry form)' },
      {
        type: 'bool',
        key: 'moderation.facultyPostsNeedApproval',
        label: 'Teachers’ notices and photos need my approval before they appear',
      },
    ],
  },
  {
    id: 'home',
    title: 'Home page',
    intro: 'The banner, highlights and welcome message.',
    fields: [
      { type: 'image', key: 'home.heroImage', label: 'Banner photo', help: 'A wide landscape photo of the school (at least 1600 pixels wide).' },
      ltext('home.heroTitle', 'Banner heading'),
      ltext('home.heroText', 'Banner text', { multiline: true }),
      { type: 'list', key: 'home.highlights', label: 'Highlights', itemLabel: 'Highlight', item: titled('Highlight') },
      ltext('home.welcome.heading', 'Welcome message heading'),
      paragraphs('home.welcome.paragraphs', 'Welcome message'),
      person('home.welcome.signatory', 'Signed by', true),
    ],
  },
  {
    id: 'about',
    title: 'About Us',
    intro: 'Introduction, vision, mission, values and history.',
    fields: [
      paragraphs('about.intro', 'Introduction'),
      { type: 'image', key: 'about.image', label: 'Photo', optional: true },
      ltext('about.vision', 'Vision', { multiline: true }),
      ltext('about.mission', 'Mission', { multiline: true }),
      { type: 'list', key: 'about.values', label: 'Values', itemLabel: 'Value', item: titled('Value') },
      paragraphs('about.history', 'History'),
      {
        type: 'group',
        key: 'about.leadershipMessage',
        label: 'Message from the managing committee',
        optional: true,
        fields: [ltext('heading', 'Heading'), paragraphs('paragraphs', 'Message'), person('person', 'Signed by')],
      },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    intro: 'Curriculum, classes, subjects and timings.',
    fields: [
      ltext('academics.intro', 'Introduction', { multiline: true }),
      ltext('academics.curriculum', 'Curriculum / board', { multiline: true }),
      {
        type: 'list',
        key: 'academics.stages',
        label: 'Classes and stages',
        itemLabel: 'Stage',
        item: { type: 'group', key: '', label: 'Stage', fields: [ltext('name', 'Name'), ltext('classes', 'Classes'), ltext('description', 'Description', { multiline: true })] },
      },
      { type: 'list', key: 'academics.subjects', label: 'Subjects', itemLabel: 'Subject', item: { type: 'ltext', key: '', label: 'Subject' } },
      { type: 'list', key: 'academics.coCurricular', label: 'Activities beyond the classroom', itemLabel: 'Activity', item: { type: 'ltext', key: '', label: 'Activity' } },
      { type: 'list', key: 'academics.timings', label: 'School timings', itemLabel: 'Timing', item: labelValue('Timing') },
      ltext('academics.calendarNote', 'Academic calendar note', { multiline: true }),
    ],
  },
  {
    id: 'facilities',
    title: 'Facilities',
    intro: 'List only facilities the school actually has.',
    fields: [
      ltext('facilities.intro', 'Introduction', { multiline: true }),
      {
        type: 'list',
        key: 'facilities.items',
        label: 'Facilities',
        itemLabel: 'Facility',
        item: {
          type: 'group',
          key: '',
          label: 'Facility',
          fields: [ltext('name', 'Name'), ltext('description', 'Description', { multiline: true }), { type: 'image', key: 'image', label: 'Photo', optional: true }],
        },
      },
    ],
  },
  {
    id: 'intros',
    title: 'Faculty & gallery text',
    intro: 'Introductions on the Faculty and Gallery pages. Profiles and photos are managed in their own sections.',
    fields: [ltext('faculty.intro', 'Faculty page introduction', { multiline: true }), ltext('gallery.intro', 'Gallery page introduction', { multiline: true })],
  },
  {
    id: 'admissions',
    title: 'Admissions',
    intro: 'Admission information and the enquiry form.',
    fields: [
      { type: 'bool', key: 'admissions.open', label: 'Admissions are open (shows a banner on the home page)' },
      ltext('admissions.session', 'Session', { help: 'e.g. 2027–28' }),
      ltext('admissions.intro', 'Introduction', { multiline: true }),
      {
        type: 'list',
        key: 'admissions.classes',
        label: 'Classes in the enquiry form',
        itemLabel: 'Class',
        item: {
          type: 'group',
          key: '',
          label: 'Class',
          fields: [
            { type: 'text', key: 'value', label: 'Code', help: 'Short code without spaces, e.g. class-1' },
            ltext('label', 'Name shown'),
          ],
        },
      },
      { type: 'list', key: 'admissions.process', label: 'Admission steps', itemLabel: 'Step', item: titled('Step') },
      { type: 'list', key: 'admissions.documents', label: 'Documents required', itemLabel: 'Document', item: { type: 'ltext', key: '', label: 'Document' } },
      { type: 'list', key: 'admissions.eligibility', label: 'Eligibility', itemLabel: 'Row', item: labelValue('Row', 'Class', 'Criteria') },
      { type: 'list', key: 'admissions.importantDates', label: 'Important dates', itemLabel: 'Date', item: labelValue('Date', 'What', 'When') },
      ltext('admissions.feesNote', 'Fees information', { multiline: true, help: 'Information only — the website never collects fees.' }),
      {
        type: 'text',
        key: 'enquiryForm.endpoint',
        label: 'Form service address',
        help: 'e.g. https://formspree.io/f/xxxx. Leave empty to let parents send enquiries by email or WhatsApp instead.',
      },
      { type: 'keyvalue', key: 'enquiryForm.extraFields', label: 'Extra form-service fields', help: 'Only if your form service needs them, e.g. access_key for Web3Forms.' },
      { type: 'text', key: 'enquiryForm.emailSubject', label: 'Email subject for enquiries' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact details',
    intro: 'Phone numbers, email, WhatsApp, address, map and social media.',
    fields: [
      {
        type: 'list',
        key: 'contact.phones',
        label: 'Phone numbers',
        itemLabel: 'Phone',
        item: { type: 'group', key: '', label: 'Phone', fields: [ltext('label', 'Label', { help: 'e.g. School office' }), { type: 'text', key: 'number', label: 'Number' }] },
      },
      { type: 'text', key: 'contact.email', label: 'Email' },
      { type: 'text', key: 'contact.whatsappNumber', label: 'WhatsApp number', help: 'With country code, digits only, e.g. 919800000000. Leave empty to hide the WhatsApp button.' },
      ltext('contact.whatsappGreeting', 'WhatsApp starting message'),
      { type: 'list', key: 'contact.address', label: 'Address', itemLabel: 'Line', item: { type: 'ltext', key: '', label: 'Address line' } },
      { type: 'text', key: 'contact.googleMapsUrl', label: 'Google Maps link', help: 'In Google Maps: Share → Copy link.' },
      { type: 'text', key: 'contact.googleMapsEmbedUrl', label: 'Google Maps embed address (optional)', help: 'In Google Maps: Share → Embed a map → copy only the src="…" address.' },
      {
        type: 'list',
        key: 'contact.officeHours',
        label: 'Office hours',
        itemLabel: 'Hours',
        item: { type: 'group', key: '', label: 'Hours', fields: [ltext('days', 'Days'), ltext('hours', 'Hours')] },
      },
      { type: 'text', key: 'social.facebook', label: 'Facebook page link' },
      { type: 'text', key: 'social.youtube', label: 'YouTube channel link' },
      { type: 'text', key: 'social.instagram', label: 'Instagram link' },
      { type: 'text', key: 'social.x', label: 'X (Twitter) link' },
    ],
  },
  {
    id: 'documents',
    title: 'Marksheet & ID card',
    intro: 'School details printed on marksheets and student ID cards. The school name, logo, address, phone and affiliation come from the other sections.',
    fields: [
      { type: 'text', key: 'documents.udiseCode', label: 'UDISE code', help: 'Printed on marksheets and ID cards. Leave empty to hide.' },
      { type: 'text', key: 'documents.session', label: 'Current session', help: 'e.g. 2026–27. Printed on ID cards.' },
      {
        type: 'text',
        key: 'documents.gradeScale',
        label: 'Grade scale',
        help: 'Lowest percentage for each grade, highest first, e.g. “90:A++, 80:A+, 70:A, 60:B+, 50:B, 40:C+, 33:C, 0:D”. Used for exams that don’t have their own grade scale, when no grade is typed in for a student.',
      },
      { type: 'text', key: 'documents.classTeacherLabel', label: 'First signature on marksheets', help: 'e.g. Class Teacher. Leave empty to hide.' },
      { type: 'text', key: 'documents.headTeacherLabel', label: 'Head-teacher signature title', help: 'e.g. Head Teacher or Headmaster. Printed on marksheets and ID cards.' },
      { type: 'text', key: 'documents.marksheetNote', label: 'Note at the bottom of marksheets', multiline: true },
      { type: 'text', key: 'documents.idCardNote', label: 'Note on ID cards', help: 'e.g. If found, please return to the school.' },
    ],
  },
  {
    id: 'legal',
    title: 'Privacy & terms',
    intro: 'Details used on the Privacy Policy and Terms pages.',
    fields: [
      { type: 'date', key: 'legal.lastUpdated', label: '“Last updated” date' },
      ltext('legal.operator', 'Organisation that runs the school', { help: 'e.g. the trust or society. Leave empty to use the school name.' }),
      ltext('legal.enquiryRetention', 'How long enquiry details are kept', { multiline: true }),
    ],
  },
];

/** Blank value for a new list item or optional group. */
export function emptyValue(f: Field): unknown {
  switch (f.type) {
    case 'text':
    case 'ltext':
      return '';
    case 'bool':
      return false;
    case 'color':
      return '#1d4e89';
    case 'date':
      return new Date().toISOString().slice(0, 10);
    case 'select':
      return f.options[0]?.value ?? '';
    case 'image':
      return { src: '', alt: '' };
    case 'group':
      return Object.fromEntries(f.fields.filter((x) => !(x.type === 'image' && x.optional) && !(x.type === 'group' && x.optional)).map((x) => [x.key, emptyValue(x)]));
    case 'list':
      return [];
    case 'keyvalue':
      return {};
  }
}

// ---------- Reading and writing dotted paths ----------
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const [head, ...rest] = path.split('.');
  const base = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  const next = rest.length ? setPath(base[head], rest.join('.'), value) : value;
  const copy = Array.isArray(base) ? [...base] : { ...base };
  if (next === undefined) delete (copy as Record<string, unknown>)[head];
  else (copy as Record<string, unknown>)[head] = next;
  return copy as T;
}
