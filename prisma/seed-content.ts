/**
 * Demo content for Module 1 (events) and Module 2 (resources). Idempotent:
 * courses upsert by (department, code), events by slug, resources by fileKey.
 * Event dates are relative to the day the seed runs so the demo always has
 * upcoming, this-week and past events.
 */
import { isCampusOpen } from "../src/config/campus-calendar";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { EventStatus, EventType, ResourceType } from "../src/generated/prisma/enums";

type Logger = { info: (message: string, context?: Record<string, unknown>) => void; warn: (message: string, context?: Record<string, unknown>) => void };

const COURSES: Record<string, ReadonlyArray<[code: string, title: string, semester: number]>> = {
  CSE: [
    ["CSE-1101", "Structured Programming", 1],
    ["CSE-1201", "Discrete Mathematics", 2],
    ["CSE-2101", "Data Structures", 3],
    ["CSE-2201", "Design and Analysis of Algorithms", 4],
    ["CSE-3101", "Database Management Systems", 5],
    ["CSE-3201", "Operating Systems", 6],
    ["CSE-3203", "Computer Networks", 6],
    ["CSE-4101", "Artificial Intelligence", 7],
  ],
  EEE: [
    ["EEE-1101", "Electrical Circuits I", 1],
    ["EEE-1201", "Electronics I", 2],
    ["EEE-2101", "Signals and Systems", 3],
    ["EEE-2201", "Electrical Machines I", 4],
    ["EEE-3101", "Power Systems I", 5],
    ["EEE-3201", "Digital Signal Processing", 6],
  ],
  CE: [
    ["CE-1101", "Engineering Mechanics", 1],
    ["CE-2101", "Mechanics of Solids", 3],
    ["CE-2201", "Surveying", 4],
    ["CE-3101", "Structural Analysis", 5],
    ["CE-3201", "Geotechnical Engineering", 6],
    ["CE-4101", "Transportation Engineering", 7],
  ],
  TE: [
    ["TE-1101", "Textile Raw Materials", 1],
    ["TE-2101", "Yarn Manufacturing I", 3],
    ["TE-2201", "Fabric Manufacturing I", 4],
    ["TE-3101", "Wet Processing Technology", 5],
    ["TE-3201", "Apparel Manufacturing", 6],
    ["TE-4101", "Textile Testing and Quality Control", 7],
  ],
  BBA: [
    ["BBA-1101", "Principles of Management", 1],
    ["BBA-1201", "Financial Accounting", 2],
    ["BBA-2101", "Principles of Marketing", 3],
    ["BBA-2201", "Business Statistics", 4],
    ["BBA-3101", "Corporate Finance", 5],
    ["BBA-3201", "Human Resource Management", 6],
  ],
  ENG: [
    ["ENG-1101", "Introduction to Literature", 1],
    ["ENG-1201", "Phonetics and Phonology", 2],
    ["ENG-2101", "Shakespeare Studies", 3],
    ["ENG-2201", "Romantic Poetry", 4],
    ["ENG-3101", "ELT Methods and Approaches", 5],
    ["ENG-3201", "Postcolonial Literature", 6],
  ],
  BAN: [
    ["BAN-1101", "History of the Bangla Language", 1],
    ["BAN-1201", "Bangla Grammar", 2],
    ["BAN-2101", "Medieval Bangla Literature", 3],
    ["BAN-2201", "Rabindranath Studies", 4],
    ["BAN-3101", "Modern Bangla Poetry", 5],
    ["BAN-3201", "Bangla Drama", 6],
  ],
  JMC: [
    ["JMC-1101", "Introduction to Mass Communication", 1],
    ["JMC-1201", "News Writing and Reporting", 2],
    ["JMC-2101", "Photojournalism", 3],
    ["JMC-2201", "Broadcast Journalism", 4],
    ["JMC-3101", "Media Law and Ethics", 5],
    ["JMC-3201", "Digital and Social Media", 6],
  ],
  LAW: [
    ["LAW-1101", "Legal System of Bangladesh", 1],
    ["LAW-1201", "Law of Contract", 2],
    ["LAW-2101", "Constitutional Law", 3],
    ["LAW-2201", "Criminal Law", 4],
    ["LAW-3101", "Law of Evidence", 5],
    ["LAW-3201", "Public International Law", 6],
  ],
};

interface SeedEvent {
  slug: string;
  club: string;
  title: string;
  type: EventType;
  /** Days from the seed date (Dhaka). */
  day: number;
  /** Local (Dhaka) start hour, e.g. 14.5 = 2:30 PM. */
  hour: number;
  hours: number;
  venue: string;
  capacity: number | null;
  status: EventStatus;
  description: string;
}

const EVENTS: SeedEvent[] = [
  { slug: "intra-university-programming-contest-2026", club: "cu-programming-club", title: "Intra-University Programming Contest 2026", type: "CONTEST", day: 9, hour: 10, hours: 5, venue: "Computer Lab 1-4, Academic Building 2", capacity: 120, status: "PUBLISHED", description: "Five hours, ten problems, teams of three. The top five teams represent City University at the ICPC Dhaka Regional. Bring your student ID; laptops are provided." },
  { slug: "hands-on-git-and-github-workshop", club: "cu-computer-club", title: "Hands-on Git & GitHub Workshop", type: "WORKSHOP", day: 3, hour: 14, hours: 3, venue: "Computer Lab 3", capacity: 60, status: "PUBLISHED", description: "Learn branching, pull requests and resolving merge conflicts by contributing to a real open-source repository. Ideal for 1st and 2nd year students." },
  { slug: "web-development-bootcamp-nextjs-from-zero", club: "cu-computer-club", title: "Web Development Bootcamp: Next.js from Zero", type: "WORKSHOP", day: 12, hour: 10, hours: 6, venue: "Seminar Hall", capacity: 80, status: "PUBLISHED", description: "A full-day bootcamp: React basics, the Next.js App Router, data fetching and deploying your first project. Lunch is provided for registered participants." },
  { slug: "line-follower-robot-competition", club: "cu-robotics-club", title: "Line Follower Robot Competition", type: "CONTEST", day: 16, hour: 9.5, hours: 6, venue: "CU Auditorium", capacity: 40, status: "PUBLISHED", description: "Build a robot that follows the track fastest. Teams of up to four. Track specifications are available at the Robotics Lab." },
  { slug: "intro-to-arduino-and-iot", club: "cu-robotics-club", title: "Intro to Arduino & IoT", type: "WORKSHOP", day: 5, hour: 15, hours: 2.5, venue: "Robotics Lab", capacity: 30, status: "PUBLISHED", description: "Blink an LED, read sensors and send data to the cloud. Kits are provided; no prior electronics experience needed." },
  { slug: "rooppur-industrial-visit-briefing", club: "cu-ee-society", title: "Industrial Visit Briefing: Rooppur Power Plant", type: "SEMINAR", day: 7, hour: 11, hours: 1.5, venue: "Room 402, Academic Building 1", capacity: 50, status: "PUBLISHED", description: "Mandatory briefing for students joining the Rooppur Nuclear Power Plant visit: safety rules, schedule and transport." },
  { slug: "startup-pitch-night", club: "cu-business-club", title: "Startup Pitch Night", type: "CONTEST", day: 20, hour: 16, hours: 4, venue: "CU Auditorium", capacity: 200, status: "PUBLISHED", description: "Ten student startups pitch to investors from the Dhaka startup ecosystem. Audience voting decides the People's Choice award." },
  { slug: "case-competition-prep-session", club: "cu-business-club", title: "Case Competition Prep Session", type: "WORKSHOP", day: 2, hour: 13, hours: 2, venue: "BBA Seminar Room", capacity: 45, status: "PUBLISHED", description: "Frameworks, slide structure and presentation tips from last year's national case competition finalists." },
  { slug: "cv-clinic-with-industry-recruiters", club: "cu-career-club", title: "CV Clinic with Industry Recruiters", type: "SEMINAR", day: 4, hour: 11, hours: 3, venue: "Seminar Hall", capacity: 100, status: "PUBLISHED", description: "Recruiters from leading Bangladeshi companies review your CV one-on-one. Bring two printed copies." },
  { slug: "mock-interview-day", club: "cu-career-club", title: "Mock Interview Day", type: "MEETUP", day: 14, hour: 10, hours: 5, venue: "Career Center", capacity: 5, status: "PUBLISHED", description: "Thirty-minute mock interviews with HR professionals and written feedback. Very limited seats." },
  { slug: "inter-department-debate-championship", club: "cu-debating-society", title: "Inter-Department Debate Championship", type: "CONTEST", day: 11, hour: 10, hours: 7, venue: "CU Auditorium", capacity: null, status: "PUBLISHED", description: "Departments compete in British Parliamentary format across Bangla and English rounds. Spectators welcome." },
  { slug: "debate-101-parliamentary-format", club: "cu-debating-society", title: "Debate 101: Parliamentary Format", type: "WORKSHOP", day: 1, hour: 15, hours: 2, venue: "Room 305, Academic Building 1", capacity: 40, status: "PUBLISHED", description: "Roles, speaking order, rebuttals and POIs explained, followed by a practice round." },
  { slug: "pohela-falgun-celebration", club: "cu-cultural-club", title: "Pohela Falgun Celebration", type: "CULTURAL", day: 25, hour: 10, hours: 8, venue: "Central Field", capacity: null, status: "PUBLISHED", description: "Music, dance, food stalls and a colourful celebration of spring. Wear yellow!" },
  { slug: "acoustic-night", club: "cu-cultural-club", title: "Acoustic Night", type: "CULTURAL", day: 6, hour: 17.5, hours: 3, venue: "Cafeteria Lawn", capacity: 150, status: "PUBLISHED", description: "An unplugged evening of student bands and solo performers under the lights." },
  { slug: "campus-photo-walk", club: "cu-photography-club", title: "Campus Photo Walk", type: "MEETUP", day: 8, hour: 7, hours: 3, venue: "Main Gate", capacity: 35, status: "PUBLISHED", description: "Golden-hour photo walk around campus with composition tips. Phones are absolutely fine." },
  { slug: "lightroom-editing-masterclass", club: "cu-photography-club", title: "Lightroom Editing Masterclass", type: "WORKSHOP", day: 18, hour: 14, hours: 3, venue: "Computer Lab 2", capacity: 40, status: "PUBLISHED", description: "Colour grading, presets and a non-destructive workflow taught by a professional photographer." },
  { slug: "short-film-screening-and-qa", club: "cu-film-drama-society", title: "Short Film Screening & Q&A", type: "CULTURAL", day: 10, hour: 16, hours: 3, venue: "CU Auditorium", capacity: 250, status: "PUBLISHED", description: "Five student short films followed by a Q&A with the directors." },
  { slug: "inter-department-cricket-final", club: "cu-sports-club", title: "Inter-Department Cricket Tournament - Final", type: "SPORTS", day: 13, hour: 9, hours: 8, venue: "Central Field", capacity: null, status: "PUBLISHED", description: "CSE vs BBA in the 20-over final. Come cheer for your department!" },
  { slug: "badminton-singles-open", club: "cu-sports-club", title: "Badminton Singles Open", type: "SPORTS", day: 3, hour: 16, hours: 4, venue: "Indoor Games Room", capacity: 32, status: "PUBLISHED", description: "Knockout singles tournament for men and women. Rackets available; bring non-marking shoes." },
  { slug: "blood-donation-camp", club: "cu-blood-donors-club", title: "Blood Donation Camp", type: "OTHER", day: 6, hour: 9, hours: 7, venue: "Medical Center", capacity: 300, status: "PUBLISHED", description: "In partnership with Quantum Foundation. Free blood grouping for every participant; donors receive a certificate." },
  { slug: "winter-clothes-drive-volunteer-meetup", club: "cu-blood-donors-club", title: "Winter Clothes Drive Volunteer Meetup", type: "MEETUP", day: 22, hour: 15, hours: 2, venue: "Room 101, Academic Building 1", capacity: 60, status: "PUBLISHED", description: "Plan this year's winter clothes distribution in northern Bangladesh. All volunteers welcome." },
  { slug: "weekly-problem-solving-session-14", club: "cu-programming-club", title: "Weekly Problem Solving Session #14", type: "WORKSHOP", day: 1, hour: 17, hours: 2, venue: "Computer Lab 1", capacity: 50, status: "PUBLISHED", description: "This week: dynamic programming on trees. Problems are posted on the club's Codeforces group." },
  { slug: "ai-seminar-llms-in-bangladesh", club: "cu-computer-club", title: "AI Seminar: LLMs in Bangladesh", type: "SEMINAR", day: 15, hour: 11, hours: 2, venue: "Seminar Hall", capacity: 180, status: "PUBLISHED", description: "How Bangla language models are built, evaluated and deployed - with researchers from local AI startups." },
  { slug: "icpc-dhaka-regional-prep-contest", club: "cu-programming-club", title: "ICPC Dhaka Regional Prep Contest", type: "CONTEST", day: -12, hour: 10, hours: 5, venue: "Computer Lab 1-4, Academic Building 2", capacity: 100, status: "COMPLETED", description: "A full mock contest in ICPC format to prepare our teams for the Dhaka Regional." },
  { slug: "freshers-reception-2026", club: "cu-cultural-club", title: "Freshers' Reception 2026", type: "CULTURAL", day: -30, hour: 10, hours: 6, venue: "CU Auditorium", capacity: null, status: "COMPLETED", description: "Welcoming the new batch with performances, club showcases and a campus tour." },
  { slug: "linkedin-profile-workshop", club: "cu-career-club", title: "LinkedIn Profile Workshop", type: "WORKSHOP", day: -5, hour: 14, hours: 2, venue: "Seminar Hall", capacity: 80, status: "COMPLETED", description: "Write a headline, summary and experience section that recruiters actually read." },
  { slug: "football-friendly-vs-diu", club: "cu-sports-club", title: "Football Friendly vs DIU", type: "SPORTS", day: -8, hour: 16, hours: 2, venue: "Central Field", capacity: null, status: "COMPLETED", description: "A friendly match against Daffodil International University." },
  { slug: "drone-building-workshop", club: "cu-robotics-club", title: "Drone Building Workshop", type: "WORKSHOP", day: 9, hour: 14, hours: 3, venue: "Robotics Lab", capacity: 25, status: "CANCELLED", description: "Assemble and fly a mini quadcopter. (Cancelled: drone kits were held at customs.)" },
  { slug: "annual-drama-festival", club: "cu-film-drama-society", title: "Annual Drama Festival", type: "CULTURAL", day: 40, hour: 17, hours: 4, venue: "CU Auditorium", capacity: 400, status: "DRAFT", description: "Three nights of student theatre productions. Lineup to be announced." },
  { slug: "pcb-design-workshop", club: "cu-ee-society", title: "PCB Design Workshop", type: "WORKSHOP", day: 28, hour: 10, hours: 4, venue: "EEE Lab 2", capacity: 30, status: "DRAFT", description: "Design a two-layer PCB in KiCad, from schematic to Gerber files." },
];

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Seed events never land on a weekly off day (Wednesday, Thursday): a clash moves to the next open day, same time. */
function onOpenDay(instant: Date): Date {
  let time = instant.getTime();
  while (!isCampusOpen(new Date(time))) time += DAY_MS;
  return new Date(time);
}

/** Start of "today" in Dhaka, as a UTC instant. */
function dhakaToday(): number {
  const local = new Date(Date.now() + DHAKA_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - DHAKA_OFFSET_MS;
}

const RESOURCE_KINDS: ReadonlyArray<{ type: ResourceType; title: (code: string, course: string, year: number) => string; tags: string[] }> = [
  { type: "QUESTION_PAPER", title: (code, _course, year) => `${code} Final Exam Question Paper (${year})`, tags: ["final", "previous question"] },
  { type: "NOTES", title: (_code, course) => `${course} - Complete Lecture Notes`, tags: ["lecture notes", "handwritten"] },
  { type: "QUESTION_PAPER", title: (code, _course, year) => `${code} Midterm Questions (${year})`, tags: ["midterm", "previous question"] },
  { type: "LAB_MANUAL", title: (_code, course) => `${course} Lab Manual`, tags: ["lab", "manual"] },
  { type: "NOTES", title: (_code, course) => `${course} - Exam Suggestions & Short Notes`, tags: ["suggestion", "short notes"] },
  { type: "QUESTION_PAPER", title: (code, _course, year) => `${code} Class Test Questions (${year})`, tags: ["class test", "ct"] },
];

/** Resources per department (60 total). */
const RESOURCE_COUNTS: Record<string, number> = { CSE: 14, EEE: 8, BBA: 8, CE: 6, TE: 5, ENG: 5, LAW: 5, JMC: 5, BAN: 4 };

/** Tiny but valid single-page PDF, generated so no binary file is committed. */
export function buildSamplePdf(): Buffer {
  const text = "CampusOS sample resource - demo content for the City University Resource Hub.";
  const stream = `BT /F1 14 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

const SAMPLE_PDF_NAME = "campusos-sample-resource.pdf";
const PLACEHOLDER_URL = "https://utfs.io/f/campusos-sample-placeholder.pdf";

/** Uploads the shared sample PDF once (tracked in UploadedFile); falls back to a flagged placeholder. */
async function ensureSamplePdf(prisma: PrismaClient, logger: Logger): Promise<string> {
  const existing = await prisma.uploadedFile.findFirst({ where: { name: SAMPLE_PDF_NAME, kind: "PDF" }, select: { url: true } });
  if (existing) return existing.url;
  try {
    const [{ getUtApi }, { UTFile }] = await Promise.all([import("../src/server/services/upload.service"), import("uploadthing/server")]);
    const pdf = buildSamplePdf();
    const { data, error } = await getUtApi().uploadFiles(new UTFile([new Uint8Array(pdf)], SAMPLE_PDF_NAME, { type: "application/pdf" }));
    if (error || !data) throw new Error(error?.message ?? "upload failed");
    await prisma.uploadedFile.create({ data: { key: data.key, url: data.ufsUrl, name: SAMPLE_PDF_NAME, size: pdf.length, mimeType: "application/pdf", kind: "PDF" } });
    logger.info("Uploaded sample PDF to UploadThing");
    return data.ufsUrl;
  } catch (error) {
    logger.warn("Sample PDF upload failed - seed resources use a flagged placeholder URL", { reason: error instanceof Error ? error.message : String(error) });
    return PLACEHOLDER_URL;
  }
}

export async function seedContent(prisma: PrismaClient, logger: Logger): Promise<void> {
  const departments = await prisma.department.findMany({ select: { id: true, code: true } });
  const departmentId = new Map(departments.map((d) => [d.code, d.id]));

  // ───────── Courses ─────────
  let courseCount = 0;
  for (const [code, list] of Object.entries(COURSES)) {
    const deptId = departmentId.get(code);
    if (!deptId) continue;
    for (const [courseCode, title, semester] of list) {
      await prisma.course.upsert({
        where: { departmentId_code: { departmentId: deptId, code: courseCode } },
        create: { departmentId: deptId, code: courseCode, title, semester, credits: 3 },
        update: { title, semester },
      });
      courseCount++;
    }
  }
  logger.info("Seeded courses", { count: courseCount });

  const superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  if (!superAdmin) {
    logger.warn("No SUPER_ADMIN account - skipping events and resources.");
    return;
  }

  // ───────── Events ─────────
  const clubs = new Map((await prisma.club.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  const today = dhakaToday();
  for (const event of EVENTS) {
    const clubId = clubs.get(event.club);
    if (!clubId) continue;
    const startAt = onOpenDay(new Date(today + event.day * DAY_MS + event.hour * 3_600_000));
    const endAt = new Date(startAt.getTime() + event.hours * 3_600_000);
    const registrationDeadline = event.type === "CONTEST" && event.day > 1 ? new Date(startAt.getTime() - DAY_MS) : null;
    const fields = { title: event.title, description: event.description, clubId, type: event.type, startAt, endAt, venue: event.venue, capacity: event.capacity, registrationDeadline, status: event.status };
    await prisma.event.upsert({ where: { slug: event.slug }, create: { ...fields, slug: event.slug, createdById: superAdmin.id }, update: fields });
  }
  logger.info("Seeded events", { count: EVENTS.length });

  // Demo registrations for the demo students.
  const demoUsers = await prisma.user.findMany({ where: { studentId: { in: ["CU-DEMO-001", "CU-DEMO-002"] } }, select: { id: true, studentId: true } });
  const demo = new Map(demoUsers.map((u) => [u.studentId, u.id]));
  const eventIds = new Map((await prisma.event.findMany({ where: { slug: { in: EVENTS.map((e) => e.slug) } }, select: { id: true, slug: true } })).map((e) => [e.slug, e.id]));
  const demoRegistrations: Array<[student: string, slug: string, checkedIn: boolean]> = [
    ["CU-DEMO-001", "hands-on-git-and-github-workshop", false],
    ["CU-DEMO-001", "cv-clinic-with-industry-recruiters", false],
    ["CU-DEMO-001", "mock-interview-day", false],
    ["CU-DEMO-001", "icpc-dhaka-regional-prep-contest", true],
    ["CU-DEMO-002", "mock-interview-day", false],
    ["CU-DEMO-002", "startup-pitch-night", false],
  ];
  const { nanoid } = await import("nanoid");
  for (const [student, slug, checkedIn] of demoRegistrations) {
    const userId = demo.get(student);
    const eventId = eventIds.get(slug);
    if (!userId || !eventId) continue;
    await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, qrToken: nanoid(32), status: checkedIn ? "CHECKED_IN" : "REGISTERED", checkedInAt: checkedIn ? new Date() : null },
      update: {},
    });
  }
  // Recompute denormalised counters from the source of truth.
  await prisma.$executeRaw`
    UPDATE "Event" e SET "registrationCount" = (
      SELECT COUNT(*) FROM "EventRegistration" r WHERE r."eventId" = e.id AND r.status::text IN ('REGISTERED', 'CHECKED_IN'))`;

  // ───────── Resources (flagged isSample) ─────────
  const sampleUrl = await ensureSamplePdf(prisma, logger);
  const courses = await prisma.course.findMany({ select: { id: true, code: true, title: true, semester: true, department: { select: { id: true, code: true } } }, orderBy: { code: "asc" } });
  const uploaders = [superAdmin.id, ...demoUsers.map((u) => u.id)];
  const demoStudent = demo.get("CU-DEMO-001") ?? superAdmin.id;
  const year = new Date().getUTCFullYear();

  let index = 0;
  for (const [code, count] of Object.entries(RESOURCE_COUNTS)) {
    const deptCourses = courses.filter((c) => c.department.code === code);
    for (let i = 0; i < count && deptCourses.length; i++) {
      index++;
      const course = deptCourses[i % deptCourses.length];
      const kind = RESOURCE_KINDS[(index + i) % RESOURCE_KINDS.length];
      const resourceYear = year - (index % 4);
      // A few pending/rejected uploads by the demo student make the moderation queue non-empty.
      const status = index % 15 === 0 ? "PENDING" : index === 22 ? "REJECTED" : "APPROVED";
      const fileKey = `sample-resource-${String(index).padStart(3, "0")}`;
      const fields = {
        title: kind.title(course.code, course.title, resourceYear),
        description: `Shared for ${course.code} (${course.title}), semester ${course.semester}. Demo content - the attached file is a sample PDF.`,
        type: kind.type,
        courseId: course.id,
        departmentId: course.department.id,
        semester: course.semester,
        year: resourceYear,
        tags: [course.code.toLowerCase(), ...kind.tags],
        fileUrl: sampleUrl,
        fileSize: 1024,
        mimeType: "application/pdf",
        status: status as "PENDING" | "REJECTED" | "APPROVED",
        rejectionReason: status === "REJECTED" ? "Scanned pages are unreadable - please upload a clearer copy." : null,
        downloadCount: status === "APPROVED" ? (index * 37) % 420 : 0,
        isSample: true,
        uploadedById: status === "APPROVED" ? uploaders[index % uploaders.length] : demoStudent,
        reviewedById: status === "PENDING" ? null : superAdmin.id,
        reviewedAt: status === "PENDING" ? null : new Date(),
      };
      await prisma.resource.upsert({ where: { fileKey }, create: { ...fields, fileKey }, update: fields });
    }
  }
  logger.info("Seeded sample resources", { count: index, sampleFile: sampleUrl === PLACEHOLDER_URL ? "placeholder" : "uploadthing" });
}
