/**
 * Privacy Policy and Terms of Use text.
 *
 * The wording describes what this website actually does: public pages set no
 * cookies and use no analytics; the staff/student portal uses one sign-in
 * cookie and stores account data. If you add analytics, a chat widget or
 * anything else that collects data, update these texts. The school should
 * have both pages reviewed before publishing.
 */
import type { Language, SchoolConfig } from '../config/types';
import { resolveText } from '../i18n/LanguageContext';
import { isSet } from '../lib/content';
import { emailAddress, mapsEmbedSrc } from '../lib/contact';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

function context(lang: Language, config: SchoolConfig) {
  const school = resolveText(config.school.name, lang);
  const operator = resolveText(config.legal.operator, lang);
  const endpoint = config.enquiryForm.endpoint.trim();
  let formHost = '';
  if (isSet(endpoint)) {
    try {
      formHost = new URL(endpoint).hostname;
    } catch {
      formHost = '';
    }
  }
  return {
    school,
    who: isSet(operator) ? operator : school,
    email: emailAddress(config) ?? resolveText(config.contact.email, lang),
    formHost,
    hasMapEmbed: mapsEmbedSrc(config) !== null,
    retention: resolveText(config.legal.enquiryRetention, lang),
  };
}

export function privacySections(lang: Language, config: SchoolConfig): LegalSection[] {
  const c = context(lang, config);
  if (lang === 'bn') {
    return [
      {
        heading: 'এই নীতি সম্পর্কে',
        paragraphs: [
          `এই ওয়েবসাইটটি ${c.who} পরিচালিত ${c.school}-এর ওয়েবসাইট। এই নীতিতে ব্যাখ্যা করা হয়েছে ওয়েবসাইটটি কোন তথ্য গ্রহণ করে এবং তা কীভাবে ব্যবহার করা হয়।`,
          'এই ওয়েবসাইটের মাধ্যমে কোনো অনলাইন পেমেন্ট নেওয়া হয় না।',
        ],
      },
      {
        heading: 'ভর্তি সংক্রান্ত জিজ্ঞাসার ফর্ম',
        paragraphs: [
          'জিজ্ঞাসার ফর্মে অভিভাবকের নাম, ছাত্র/ছাত্রীর নাম, আগ্রহের শ্রেণি, যোগাযোগের নম্বর, এবং ইচ্ছা হলে ইমেল ঠিকানা ও বার্তা চাওয়া হয়। এই তথ্য কেবল আপনার জিজ্ঞাসার উত্তর দিতে ব্যবহার করা হয়। জিজ্ঞাসা পাঠালে কোনো ছাত্রছাত্রীর নাম নথিভুক্ত বা ভর্তি হয় না।',
          c.formHost
            ? `ফর্মটি জমা দিলে আপনার তথ্য একটি তৃতীয় পক্ষের ফর্ম পরিষেবার (${c.formHost}) মাধ্যমে বিদ্যালয়ে পৌঁছায়। ওই পরিষেবা নিজস্ব গোপনীয়তা নীতি অনুযায়ী তথ্যটি প্রক্রিয়া করে।`
            : 'এই ওয়েবসাইট নিজে ফর্মের তথ্য পাঠায় বা সংরক্ষণ করে না। ফর্ম পূরণ করলে আপনার ইমেল বা হোয়াটসঅ্যাপ অ্যাপ খোলে, এবং আপনি নিজে Send চাপলে তবেই বার্তাটি বিদ্যালয়ে পৌঁছায়।',
          `জিজ্ঞাসার তথ্য সংরক্ষণের সময়সীমা: ${c.retention}`,
          'বিদ্যালয় এই তথ্য বিক্রি করে না এবং বিজ্ঞাপনের জন্য ব্যবহার করে না।',
          'অনুগ্রহ করে কেবল অভিভাবক বা আইনগত অভিভাবকই ফর্মটি পূরণ করবেন।',
        ],
      },
      {
        heading: 'শিক্ষক ও ছাত্রছাত্রীদের অ্যাকাউন্ট',
        paragraphs: [
          'বিদ্যালয় প্রধান শিক্ষক, শিক্ষক-শিক্ষিকা ও ছাত্রছাত্রীদের জন্য পোর্টাল অ্যাকাউন্ট তৈরি করে। শিক্ষক-কর্মীদের অ্যাকাউন্টে ইউজারনেম, নাম, ভূমিকা, পাসওয়ার্ড (কেবল নিরাপদ হ্যাশ হিসেবে, আসল পাসওয়ার্ড নয়), সাইন-ইনের সময় এবং পোর্টালে করা পরিবর্তনের একটি লগ সংরক্ষিত থাকে। ছাত্রছাত্রীদের অ্যাকাউন্টে নাম, বিদ্যালয়ের দেওয়া স্টুডেন্ট আইডি ও জন্ম তারিখ (এই দুটি দিয়ে সাইন ইন করা হয়) এবং সাইন-ইনের সময় সংরক্ষিত থাকে।',
          'ছাত্রছাত্রীদের অ্যাকাউন্ট দিয়ে ছাত্রছাত্রীদের জন্য প্রকাশিত বিজ্ঞপ্তি এবং বিদ্যালয় প্রকাশ করার পর নিজের পরীক্ষার ফল দেখা যায়। ফল প্রধান শিক্ষক যোগ করেন এবং প্রত্যেক ছাত্র/ছাত্রী কেবল নিজের ফলই দেখতে পায়। উপস্থিতি বা ফি সংক্রান্ত কোনো রেকর্ড রাখা হয় না।',
          'শিক্ষকরা নিজেদের প্রোফাইল ছবি ও তথ্য প্রকাশ করতে পারেন। আপলোড করা ছবি থেকে অবস্থান (GPS) সহ সব লুকানো তথ্য মুছে ফেলা হয়।',
          'অ্যাকাউন্টের তথ্য বিদ্যালয়ের হোস্টিং পরিষেবার সার্ভারে রাখা হয়। অ্যাকাউন্ট মুছে ফেলার অনুরোধ প্রধান শিক্ষকের কাছে করা যায়।',
        ],
      },
      {
        heading: 'কুকি ও আপনার ব্রাউজারে সংরক্ষিত তথ্য',
        paragraphs: [
          'সাধারণ দর্শকদের জন্য এই ওয়েবসাইট কোনো কুকি ব্যবহার করে না এবং কোনো অ্যানালিটিক্স বা বিজ্ঞাপনের ট্র্যাকিং ব্যবহার করে না।',
          'পোর্টালে সাইন ইন করলে আপনাকে সাইন-ইন অবস্থায় রাখতে একটি অত্যাবশ্যক কুকি ব্যবহার হয়। ৮ ঘণ্টা নিষ্ক্রিয় থাকলে বা সাইন আউট করলে এটির মেয়াদ শেষ হয়।',
          'আপনি ভাষা বেছে নিলে সেই পছন্দটি কেবল আপনার ব্রাউজারে (localStorage) সংরক্ষিত থাকে। এই তথ্য কোথাও পাঠানো হয় না।',
        ],
      },
      {
        heading: 'হোস্টিং',
        paragraphs: [
          'অন্যান্য ওয়েবসাইটের মতোই, যে সংস্থা এই ওয়েবসাইট হোস্ট করে তারা নিরাপত্তা ও পরিচালনার জন্য সাধারণ প্রযুক্তিগত লগ (যেমন IP ঠিকানা, ব্রাউজারের ধরন, দেখা পৃষ্ঠা) রাখতে পারে।',
        ],
      },
      {
        heading: 'বাইরের পরিষেবা ও লিংক',
        paragraphs: [
          'এই ওয়েবসাইটে গুগল ম্যাপস, হোয়াটসঅ্যাপ ও সোশ্যাল মিডিয়ার লিংক থাকতে পারে। এই লিংকে ক্লিক করলে সংশ্লিষ্ট পরিষেবার নিজস্ব গোপনীয়তা নীতি প্রযোজ্য হয়।',
          ...(c.hasMapEmbed
            ? ['যোগাযোগ পৃষ্ঠায় গুগল ম্যাপসের একটি মানচিত্র দেখানো হয়। মানচিত্রটি লোড হলে গুগল কুকি ব্যবহার করতে পারে এবং আপনার ব্রাউজার থেকে তথ্য পেতে পারে।']
            : []),
        ],
      },
      {
        heading: 'যোগাযোগ',
        paragraphs: [`এই নীতি বা আপনার তথ্য সম্পর্কে কোনো প্রশ্ন থাকলে, অথবা তথ্য সংশোধন বা মুছে ফেলার অনুরোধ জানাতে, ${c.email} ঠিকানায় অথবা বিদ্যালয় অফিসে যোগাযোগ করুন।`],
      },
    ];
  }
  return [
    {
      heading: 'About this policy',
      paragraphs: [
        `This website belongs to ${c.school}, operated by ${c.who}. This policy explains what information the website receives and how it is used.`,
        'No online payments are taken through this website.',
      ],
    },
    {
      heading: 'Admission enquiry form',
      paragraphs: [
        'The enquiry form asks for the parent or guardian’s name, the student’s name, the class of interest, a contact number and, optionally, an email address and a message. These details are used only to respond to your enquiry. Sending an enquiry does not register or admit a student.',
        c.formHost
          ? `When you submit the form, your details are delivered to the school through a third-party form service (${c.formHost}), which processes them under its own privacy policy.`
          : 'This website does not itself send or store form details. Filling in the form opens your email or WhatsApp app, and the message reaches the school only if you press Send there.',
        `How long enquiry details are kept: ${c.retention}`,
        'The school does not sell this information or use it for advertising.',
        'The form should be completed by a parent or legal guardian.',
      ],
    },
    {
      heading: 'Staff and student accounts',
      paragraphs: [
        'The school creates portal accounts for the head teacher, teachers and students. For staff accounts we store a username, name, role, the password (only as a secure one-way hash, never the password itself), sign-in times and a log of changes made in the portal. For student accounts we store the student’s name, the student ID given by the school and their date of birth, which together are used to sign in, plus sign-in times.',
        'Student accounts are used to read notices published for students and to see that student’s own exam results once the school publishes them. Results are entered by the head teacher, and each student can see only their own. No attendance or fee records are kept.',
        'Teachers may publish their own profile photo and details. Uploaded photos have hidden data, including GPS location, removed.',
        'Account data is stored on the servers of the school’s hosting provider. Ask the head teacher to have an account deleted.',
      ],
    },
    {
      heading: 'Cookies and browser storage',
      paragraphs: [
        'Visitors who do not sign in get no cookies from this website, and no analytics or advertising trackers are used.',
        'If you sign in to the portal, one strictly necessary cookie keeps you signed in. It expires after 8 hours without activity or when you sign out.',
        'If you choose a language, that preference is saved only in your own browser (localStorage). It is never sent anywhere.',
      ],
    },
    {
      heading: 'Hosting',
      paragraphs: [
        'As with any website, the company that hosts this site may keep standard technical logs (such as IP address, browser type and pages requested) for security and operation.',
      ],
    },
    {
      heading: 'External services and links',
      paragraphs: [
        'This website may link to Google Maps, WhatsApp and social-media pages. When you follow those links, the privacy policy of that service applies.',
        ...(c.hasMapEmbed
          ? ['The Contact page shows an embedded Google Maps map. When the map loads, Google may set cookies and receive information from your browser.']
          : []),
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        `For questions about this policy or your information, or to ask for your details to be corrected or deleted, contact ${c.email} or the school office.`,
      ],
    },
  ];
}

export function termsSections(lang: Language, config: SchoolConfig): LegalSection[] {
  const c = context(lang, config);
  if (lang === 'bn') {
    return [
      {
        heading: 'ওয়েবসাইটের উদ্দেশ্য',
        paragraphs: [`এই ওয়েবসাইট ${c.school} সম্পর্কে তথ্য দেওয়ার জন্য। এটি ব্যবহার করে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন।`],
      },
      {
        heading: 'তথ্যের নির্ভুলতা',
        paragraphs: [
          'আমরা তথ্য সঠিক ও হালনাগাদ রাখার চেষ্টা করি, তবে সময়সূচি, তারিখ ও ভর্তির নিয়ম পরিবর্তন হতে পারে। কোনো সিদ্ধান্ত নেওয়ার আগে অনুগ্রহ করে বিদ্যালয় অফিসে তথ্য যাচাই করে নিন। বিদ্যালয়ের সরকারি বিজ্ঞপ্তিই চূড়ান্ত বলে গণ্য হবে।',
        ],
      },
      {
        heading: 'ভর্তি সংক্রান্ত জিজ্ঞাসা',
        paragraphs: [
          'জিজ্ঞাসার ফর্ম জমা দিলে ভর্তি, আসন সংরক্ষণ বা নাম নথিভুক্তির কোনো নিশ্চয়তা পাওয়া যায় না। এই ওয়েবসাইটের মাধ্যমে কোনো ফি বা অর্থ গ্রহণ করা হয় না। কেউ এই ওয়েবসাইটের নাম করে অর্থ চাইলে সরাসরি বিদ্যালয় অফিসে যাচাই করুন।',
        ],
      },
      {
        heading: 'পোর্টাল অ্যাকাউন্ট',
        paragraphs: [
          'পোর্টাল অ্যাকাউন্ট বিদ্যালয় দেয় এবং বিদ্যালয় যেকোনো সময় তা স্থগিত বা মুছে ফেলতে পারে। নিজের পাসওয়ার্ড গোপন রাখুন এবং অন্য কারও সঙ্গে ভাগ করবেন না। শিক্ষকরা কেবল এমন ছবি ও লেখা প্রকাশ করবেন যা প্রকাশের অনুমতি আছে।',
        ],
      },
      {
        heading: 'ছবি ও বিষয়বস্তু',
        paragraphs: [
          `এই ওয়েবসাইটের লেখা, লোগো ও ছবি ${c.who}-এর অথবা অনুমতি নিয়ে ব্যবহৃত। অনুমতি ছাড়া এগুলি বাণিজ্যিক কাজে ব্যবহার করা যাবে না। কোনো ছবি সরানোর অনুরোধ থাকলে বিদ্যালয়ে যোগাযোগ করুন।`,
        ],
      },
      {
        heading: 'বাইরের লিংক',
        paragraphs: ['বাইরের ওয়েবসাইটের বিষয়বস্তু বা নীতির জন্য বিদ্যালয় দায়ী নয়।'],
      },
      {
        heading: 'যোগাযোগ',
        paragraphs: [`এই শর্তাবলি সম্পর্কে প্রশ্ন থাকলে ${c.email} ঠিকানায় যোগাযোগ করুন।`],
      },
    ];
  }
  return [
    {
      heading: 'Purpose of this website',
      paragraphs: [`This website provides information about ${c.school}. By using it you agree to these terms.`],
    },
    {
      heading: 'Accuracy of information',
      paragraphs: [
        'We try to keep information accurate and up to date, but timings, dates and admission rules can change. Please confirm details with the school office before making decisions. Official notices issued by the school take precedence over this website.',
      ],
    },
    {
      heading: 'Admission enquiries',
      paragraphs: [
        'Submitting an enquiry does not guarantee admission, reserve a seat or register a student. No fees or payments are collected through this website. If anyone asks you for money in the name of this website, please check directly with the school office.',
      ],
    },
    {
      heading: 'Portal accounts',
      paragraphs: [
        'Portal accounts are provided by the school and may be suspended or removed by the school at any time. Keep your password private and do not share your account. Teachers must only publish photos and text that they have permission to publish.',
      ],
    },
    {
      heading: 'Photos and content',
      paragraphs: [
        `Text, logos and photographs on this website belong to ${c.who} or are used with permission, and may not be reused commercially without permission. To request removal of a photo, please contact the school.`,
      ],
    },
    {
      heading: 'External links',
      paragraphs: ['The school is not responsible for the content or policies of external websites linked from this site.'],
    },
    {
      heading: 'Contact',
      paragraphs: [`For questions about these terms, contact ${c.email}.`],
    },
  ];
}
