import { CAMPUS_WEEK_ORDER, WEEKDAY, WEEKDAY_NAMES, type Weekday } from "@/config/campus-calendar";

/**
 * Chatbot vocabulary. Each concept maps English, Banglish (romanised Bangla) and
 * Bangla variants onto canonical English terms - the words the knowledge base is
 * written in - so "porikkha kobe", "পরীক্ষা কবে" and "exam when" retrieve the same
 * entries. Keep variants lower-case; multi-word variants are matched as phrases.
 */
export interface SynonymConcept {
  /** Canonical English search terms added when the concept is detected. */
  terms: string[];
  variants: string[];
}

/** Concept key for a weekday ("weekday_3" is Wednesday); used by intent detection. */
export const weekdayConcept = (weekday: Weekday): string => `weekday_${weekday}`;

/** Banglish and Bangla names for each weekday; English names come from the calendar config. */
const WEEKDAY_ALIASES: Record<Weekday, string[]> = {
  [WEEKDAY.SUNDAY]: ["robibar", "robivar", "রবিবার"],
  [WEEKDAY.MONDAY]: ["sombar", "shombar", "সোমবার"],
  [WEEKDAY.TUESDAY]: ["tue", "tues", "mongolbar", "mongalbar", "মঙ্গলবার"],
  [WEEKDAY.WEDNESDAY]: ["wed", "budhbar", "budhbaar", "বুধবার"],
  [WEEKDAY.THURSDAY]: ["thu", "thur", "thurs", "brihospotibar", "brihoshpotibar", "brihaspatibar", "বৃহস্পতিবার", "বৃহস্পতিবার"],
  [WEEKDAY.FRIDAY]: ["fri", "shukrobar", "sukrobar", "shukrabar", "শুক্রবার"],
  [WEEKDAY.SATURDAY]: ["shonibar", "sanibar", "শনিবার"],
};

const WEEKDAY_CONCEPTS: Record<string, SynonymConcept> = Object.fromEntries(
  CAMPUS_WEEK_ORDER.map((weekday) => {
    const english = WEEKDAY_NAMES[weekday].toLowerCase();
    return [weekdayConcept(weekday), { terms: [english], variants: [english, ...WEEKDAY_ALIASES[weekday]] }];
  }),
);

export const SYNONYMS: Record<string, SynonymConcept> = {
  ...WEEKDAY_CONCEPTS,
  university: { terms: ["university"], variants: ["university", "varsity", "versity", "uni", "বিশ্ববিদ্যালয়", "ভার্সিটি"] },
  holiday: { terms: ["holiday"], variants: ["holiday", "holidays", "off day", "offday", "weekly off", "closed", "weekend", "chuti", "chhuti", "ছুটি", "ছুটির"] },
  workday: { terms: ["working", "day"], variants: ["working day", "working days", "workday", "workdays", "open day", "class day", "kajer din", "কাজের দিন"] },
  tomorrow: { terms: ["tomorrow"], variants: ["tomorrow", "tomorow", "tmrw", "kal", "kaal", "kalke", "kaalke", "কাল", "কালকে", "আগামীকাল"] },
  days: { terms: [], variants: ["days", "which days", "what days", "kon din", "kon kon din", "kon dine", "কোন দিন", "কোন কোন দিন"] },
  bus: { terms: ["bus", "transport"], variants: ["bus", "buses", "shuttle", "transport", "transportation", "gari", "gaari", "garir", "বাস", "গাড়ি", "গাড়ি", "পরিবহন"] },
  exam: { terms: ["exam", "examination"], variants: ["exam", "exams", "examination", "final", "finals", "midterm", "mid", "quiz", "porikkha", "porikha", "pariksha", "poriksha", "পরীক্ষা", "পরীক্ষার"] },
  schedule: { terms: ["schedule", "time", "hours"], variants: ["schedule", "routine", "timetable", "timing", "timings", "time", "hours", "somoy", "shomoy", "koyta", "koytay", "kotokhon", "porjonto", "সময়", "সময়", "সময়সূচি", "রুটিন", "কয়টা", "পর্যন্ত"] },
  fee: { terms: ["fee", "payment"], variants: ["fee", "fees", "tuition", "payment", "pay", "beton", "taka", "বেতন", "ফি", "টাকা"] },
  library: { terms: ["library", "book"], variants: ["library", "lib", "books", "book", "boi", "pathagar", "লাইব্রেরি", "গ্রন্থাগার", "বই"] },
  idCard: { terms: ["id", "card"], variants: ["id card", "idcard", "id", "card", "আইডি", "কার্ড"] },
  attendance: { terms: ["attendance"], variants: ["attendance", "present", "absent", "hajira", "hajiri", "upasthiti", "হাজিরা", "উপস্থিতি"] },
  admission: { terms: ["admission"], variants: ["admission", "admit", "vorti", "bhorti", "ভর্তি"] },
  result: { terms: ["result", "grade"], variants: ["result", "results", "grade", "grades", "gpa", "cgpa", "folafol", "ফলাফল", "রেজাল্ট"] },
  class: { terms: ["class"], variants: ["class", "classes", "klass", "lecture", "ক্লাস"] },
  cancel: { terms: ["cancel", "cancellation"], variants: ["cancel", "cancelled", "canceled", "cancellation", "off", "bondho", "bandh", "বন্ধ", "বাতিল"] },
  form: { terms: ["form", "application"], variants: ["form", "forms", "application", "apply", "abedon", "আবেদন", "ফর্ম", "ফরম"] },
  event: { terms: ["event"], variants: ["event", "events", "program", "programme", "onusthan", "অনুষ্ঠান", "ইভেন্ট"] },
  deadline: { terms: ["deadline"], variants: ["deadline", "last date", "due date", "shesh tarikh", "sesh tarikh", "শেষ তারিখ"] },
  next: { terms: ["next"], variants: ["next", "porer", "porerta", "পরের", "upcoming", "ashche", "আসছে"] },
  today: { terms: ["today"], variants: ["today", "aj", "aaj", "ajke", "aajke", "আজ", "আজকে"] },
  week: { terms: ["week"], variants: ["week", "weekly", "soptah", "shoptaho", "সপ্তাহ", "this week"] },
  notice: { terms: ["notice"], variants: ["notice", "notices", "announcement", "noticeboard", "নোটিশ"] },
  open: { terms: ["open"], variants: ["open", "opening", "available", "ache", "khola", "khula", "চালু", "খোলা"] },
  bring: { terms: ["bring"], variants: ["bring", "carry", "niye", "niya", "nite", "nie", "anbo", "নিয়ে", "নিয়ে", "আনতে"] },
  // Question forms: no search terms (not topics) - they only bias ranking towards matching FAQ phrasing.
  when: { terms: [], variants: ["when", "kokhon", "kobe", "কখন", "কবে"] },
  where: { terms: [], variants: ["where", "kothay", "kothai", "কোথায়", "কোথায়"] },
  how: { terms: [], variants: ["how", "kivabe", "kibhabe", "kibabe", "kemne", "কিভাবে", "কীভাবে"] },
  complaint: { terms: ["complaint"], variants: ["complaint", "complain", "ovijog", "abhijog", "অভিযোগ"] },
  lost: { terms: ["lost", "found"], variants: ["lost", "lose", "missing", "haralam", "harale", "haray", "hariye", "harano", "হারিয়ে", "হারালে", "হারানো", "found", "peyechi", "পেয়েছি"] },
  hostel: { terms: ["hostel", "accommodation"], variants: ["hostel", "hall", "dorm", "accommodation", "seat"] },
  scholarship: { terms: ["scholarship", "waiver"], variants: ["scholarship", "waiver", "britti", "বৃত্তি"] },
  registration: { terms: ["registration", "course"], variants: ["registration", "register", "nibondhon", "নিবন্ধন", "course registration"] },
  wifi: { terms: ["wifi", "internet"], variants: ["wifi", "wi fi", "internet", "net"] },
  canteen: { terms: ["cafeteria", "food"], variants: ["canteen", "cafeteria", "food", "khabar", "খাবার"] },
  certificate: { terms: ["certificate", "transcript"], variants: ["certificate", "transcript", "sonod", "সনদ"] },
  retake: { terms: ["retake", "improvement"], variants: ["retake", "improvement", "supplementary", "backlog"] },
};

/** Words carrying no meaning for retrieval (English + common Banglish fillers). */
export const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "to", "of", "in", "on", "at", "for", "and", "or", "it", "do", "does",
  "i", "me", "my", "we", "you", "your", "can", "could", "please", "pls", "tell", "about", "what", "which", "who", "how",
  "there", "any", "from", "with", "this", "that", "these", "get", "will", "should", "need", "want", "know",
  "ki", "koto", "er", "r", "ar", "te", "ta", "ti", "na", "keno", "amar", "amake", "ami", "bolen", "bolo", "kon", "jodi",
  // Banglish verbs/auxiliaries ("ki korbo", "kivabe pay korbo", "kobe hobe")
  "korbo", "korte", "kori", "kore", "korbe", "hobe", "hoy", "hoye", "hocche", "jabe", "jay", "jete", "dibo", "dite", "debo", "pabo", "pai", "lagbe", "thake", "theke", "chai", "dorkar",
  "কি", "কী", "এর", "আমার", "আমি", "কোন", "কত", "বলুন", "কেন", "হবে", "হয়", "হয়", "করবো", "করব", "করতে", "যাবে", "দিতে", "লাগবে", "থাকে",
]);
