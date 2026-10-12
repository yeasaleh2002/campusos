/**
 * SEO keyword groups (English + Banglish + Bangla), merged per page by
 * `keywordsFor(...)`. Brand variants are combined with topic phrases so the
 * common ways students actually search ("cu bus time", "city uni notice")
 * are covered without hand-maintaining thousands of strings.
 */

const BRANDS = ["City University", "City University Bangladesh", "CU", "City Uni", "CityU BD"] as const;

/** "bus schedule" → ["City University bus schedule", "CU bus schedule", …] */
function branded(topics: readonly string[]): string[] {
  return topics.flatMap((topic) => BRANDS.map((brand) => `${brand} ${topic}`));
}

const core = [
  "CampusOS",
  "Campus OS",
  "CampusOS City University",
  "City University",
  "City University Bangladesh",
  "City University Dhaka",
  "City University Khagan",
  "City University Birulia",
  "City University Savar",
  "City University permanent campus",
  "City University student portal",
  "City University campus app",
  "private university Bangladesh",
  "private university Dhaka",
  "university student hub Bangladesh",
  "campus super app",
  "unified campus platform",
  "student life app Bangladesh",
  "সিটি ইউনিভার্সিটি",
  "সিটি ইউনিভার্সিটি ঢাকা",
  "সিটি ইউনিভার্সিটি খাগান",
  "সিটি ইউনিভার্সিটি স্টুডেন্ট পোর্টাল",
  "city university student der jonno app",
  "city uni campus info",
  ...branded(["portal", "students", "campus", "student services", "official updates"]),
] as const;

const home = [
  "one place for all of City University",
  "campus events notices bus in one place",
  "City University daily updates",
  "City University this week",
  "class cancellation alert",
  "campus announcements Bangladesh",
  "student dashboard Bangladesh",
  "campus chatbot Bangladesh",
  "আজকের ক্যাম্পাস আপডেট",
  "campus update aj",
  ...branded(["today", "news", "updates", "student life", "app"]),
] as const;

const events = [
  "university events Dhaka",
  "campus events Bangladesh",
  "student club events",
  "tech fest Bangladesh",
  "programming contest Dhaka",
  "seminar Dhaka university",
  "workshop for students Dhaka",
  "hackathon Bangladesh",
  "cultural program university",
  "event registration QR ticket",
  "event check-in QR",
  "events this week campus",
  "upcoming seminars",
  "ক্যাম্পাস ইভেন্ট",
  "সেমিনার রেজিস্ট্রেশন",
  "event e register kivabe",
  "cu fest",
  ...branded(["events", "event calendar", "seminar", "workshop", "fest", "event registration", "upcoming events", "programming contest"]),
] as const;

const clubs = [
  "university clubs Bangladesh",
  "student organizations Dhaka",
  "computer club",
  "programming club",
  "robotics club",
  "debate club",
  "cultural club",
  "photography club",
  "sports club",
  "career club",
  "join a club university",
  "ক্লাব",
  "club e join korbo kivabe",
  ...branded(["clubs", "computer club", "programming club", "debating club", "cultural club", "robotics club", "club activities"]),
] as const;

const resources = [
  "previous year questions",
  "question bank university",
  "lecture notes pdf",
  "class notes pdf Bangladesh",
  "CSE notes pdf",
  "EEE notes pdf",
  "BBA notes pdf",
  "English department notes",
  "Law notes pdf",
  "Pharmacy notes pdf",
  "Civil engineering notes pdf",
  "Textile engineering notes",
  "midterm question",
  "final exam question",
  "lab report pdf",
  "slides pdf",
  "assignment help notes",
  "study materials university",
  "course materials download",
  "data structures notes",
  "algorithms notes",
  "database management system notes",
  "DBMS previous questions",
  "discrete math notes",
  "computer networks notes",
  "operating system notes",
  "digital logic design notes",
  "circuit analysis notes",
  "accounting notes BBA",
  "microeconomics notes",
  "আগের বছরের প্রশ্ন",
  "লেকচার নোট",
  "প্রশ্ন ব্যাংক",
  "ager bochorer question",
  "note pdf download",
  "suggestion pdf",
  "mid question pdf",
  "final question pdf",
  ...branded(["previous questions", "question bank", "notes", "lecture notes", "resources", "CSE notes", "BBA notes", "EEE notes", "study materials", "pdf"]),
] as const;

const helpdesk = [
  "university FAQ",
  "student helpdesk",
  "admission FAQ",
  "exam rules university",
  "grading policy",
  "retake policy",
  "improvement exam rules",
  "credit transfer rules",
  "tuition fee payment",
  "waiver and scholarship",
  "academic calendar",
  "registration deadline",
  "campus chatbot",
  "ask a question campus assistant",
  "প্রশ্ন ও উত্তর",
  "ভর্তি তথ্য",
  "পরীক্ষার নিয়ম",
  "help desk e jogajog",
  "exam er rules ki",
  ...branded(["helpdesk", "FAQ", "admission", "admission requirements", "tuition fees", "scholarship", "waiver", "exam rules", "academic calendar", "grading system", "contact"]),
] as const;

const bus = [
  "university bus schedule Dhaka",
  "campus transport schedule",
  "next bus time",
  "bus route Dhaka to Savar",
  "Mirpur to Khagan bus",
  "Uttara to Khagan bus",
  "Dhanmondi to Birulia bus",
  "Mohammadpur bus route university",
  "Gabtoli bus university",
  "student transport Bangladesh",
  "বাসের সময়সূচি",
  "পরবর্তী বাস",
  "ক্যাম্পাস বাস",
  "bus kokhon chare",
  "bus er time",
  "cu bus time",
  ...branded(["bus schedule", "bus route", "transport", "bus time", "shuttle", "next bus", "transport office"]),
] as const;

const notices = [
  "university notice board",
  "class cancellation notice",
  "exam schedule notice",
  "holiday notice university",
  "department notice",
  "routine notice",
  "result published notice",
  "admit card notice",
  "নোটিশ বোর্ড",
  "ক্লাস বাতিল",
  "পরীক্ষার রুটিন",
  "notice ki dise",
  "class off ajke",
  ...branded(["notice", "notice board", "exam schedule", "class routine", "holiday notice", "result", "admit card", "department notice"]),
] as const;

const forms = [
  "open Google Forms university",
  "student registration forms",
  "application deadline",
  "club recruitment form",
  "event application form",
  "survey form students",
  "ফর্ম পূরণ",
  "form er deadline",
  ...branded(["forms", "application form", "recruitment form", "deadline"]),
] as const;

const lostFound = [
  "lost and found campus",
  "lost ID card university",
  "found wallet campus",
  "lost phone university",
  "lost bag campus",
  "lost keys campus",
  "report lost item",
  "claim found item",
  "হারানো ও প্রাপ্তি",
  "হারানো আইডি কার্ড",
  "harano jinish khujbo",
  "id card harai geche",
  ...branded(["lost and found", "lost ID card", "found items", "lost items"]),
] as const;

const complaints = [
  "student complaint portal",
  "anonymous complaint university",
  "campus issue report",
  "track complaint ticket",
  "grievance redressal university",
  "harassment report campus",
  "facility complaint",
  "অভিযোগ জমা",
  "অভিযোগ ট্র্যাক",
  "complain korbo kivabe",
  ...branded(["complaint", "complaint box", "grievance", "report issue", "complaint tracking"]),
] as const;

const auth = [
  "student login",
  "student sign up",
  "verify email OTP",
  "reset password student portal",
  "লগইন",
  "account khulbo kivabe",
  ...branded(["login", "sign up", "student account", "password reset"]),
] as const;

const search = [
  "search campus",
  "find notes and events",
  "campus search engine",
  "খুঁজুন",
  ...branded(["search"]),
] as const;

export const keywordGroups = {
  core,
  home,
  events,
  clubs,
  resources,
  helpdesk,
  bus,
  notices,
  forms,
  lostFound,
  complaints,
  auth,
  search,
} as const;

export type KeywordGroup = keyof typeof keywordGroups;

/** Every unique keyword (useful for counting and the README). */
export const allKeywords: readonly string[] = Array.from(new Set(Object.values(keywordGroups).flat()));

/**
 * Keywords for a page: core brand terms + the page groups + page-specific
 * extras (e.g. an event title), de-duplicated case-insensitively and capped
 * so the meta tag stays reasonable.
 */
export function keywordsFor(groups: KeywordGroup[], extra: readonly string[] = [], limit = 60): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const pageTerms = groups.flatMap((group) => keywordGroups[group]);
  for (const keyword of [...extra, ...pageTerms, ...keywordGroups.core]) {
    const key = keyword.toLowerCase();
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
    if (result.length >= limit) break;
  }
  return result;
}
