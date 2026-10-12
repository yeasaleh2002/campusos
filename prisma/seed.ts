/**
 * Idempotent seed: staff accounts + demo students (credentials from env only),
 * departments and clubs. Safe to re-run; existing passwords are never overwritten.
 *
 *   npm run db:seed
 */
try {
  process.loadEnvFile(".env");
} catch {
  // Variables provided by the environment (CI / hosting).
}

type SeedRole = "SUPER_ADMIN" | "ADMIN" | "CLUB_ADMIN" | "MODERATOR" | "USER";
type SeedClubCategory =
  | "TECHNOLOGY"
  | "ACADEMIC"
  | "CULTURAL"
  | "SPORTS"
  | "ARTS"
  | "DEBATE"
  | "SOCIAL_SERVICE";

interface SeedAccount {
  envPrefix: string;
  email: string;
  password: string;
  name: string;
  role: SeedRole;
  studentId?: string;
  departmentCode?: string;
  batch?: string;
}

const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering", faculty: "Faculty of Science & Engineering" },
  { code: "EEE", name: "Electrical & Electronic Engineering", faculty: "Faculty of Science & Engineering" },
  { code: "CE", name: "Civil Engineering", faculty: "Faculty of Science & Engineering" },
  { code: "TE", name: "Textile Engineering", faculty: "Faculty of Science & Engineering" },
  { code: "BBA", name: "Business Administration", faculty: "Faculty of Business" },
  { code: "ENG", name: "English", faculty: "Faculty of Arts & Social Science" },
  { code: "BAN", name: "Bangla", faculty: "Faculty of Arts & Social Science" },
  { code: "JMC", name: "Journalism & Media Communication", faculty: "Faculty of Arts & Social Science" },
  { code: "LAW", name: "Law", faculty: "Faculty of Law" },
] as const;

const CLUBS: ReadonlyArray<{ slug: string; name: string; category: SeedClubCategory; description: string }> = [
  { slug: "cu-computer-club", name: "CU Computer Club", category: "TECHNOLOGY", description: "Workshops, hackathons and tech talks for everyone curious about computing." },
  { slug: "cu-programming-club", name: "CU Programming & Problem Solving Club", category: "TECHNOLOGY", description: "Weekly contests, ICPC preparation and competitive programming bootcamps." },
  { slug: "cu-robotics-club", name: "CU Robotics & Innovation Club", category: "TECHNOLOGY", description: "Build robots, IoT gadgets and compete in national robotics olympiads." },
  { slug: "cu-ee-society", name: "CU Electrical & Electronics Society", category: "ACADEMIC", description: "Circuit design sessions, industry visits and project showcases for EEE students." },
  { slug: "cu-business-club", name: "CU Business & Entrepreneurship Club", category: "ACADEMIC", description: "Case competitions, startup pitch nights and corporate networking." },
  { slug: "cu-career-club", name: "CU Career Development Club", category: "ACADEMIC", description: "CV clinics, mock interviews and job-fair preparation." },
  { slug: "cu-debating-society", name: "CU Debating Society", category: "DEBATE", description: "Parliamentary debate training and inter-university tournaments in Bangla and English." },
  { slug: "cu-cultural-club", name: "CU Cultural Club", category: "CULTURAL", description: "Music, dance and drama - organisers of Pohela Boishakh and the annual cultural night." },
  { slug: "cu-photography-club", name: "CU Photography Club", category: "ARTS", description: "Photo walks, editing workshops and the annual campus exhibition." },
  { slug: "cu-film-drama-society", name: "CU Film & Drama Society", category: "ARTS", description: "Short films, stage plays and screenwriting circles." },
  { slug: "cu-sports-club", name: "CU Sports Club", category: "SPORTS", description: "Cricket, football and badminton teams plus the inter-department sports week." },
  { slug: "cu-blood-donors-club", name: "CU Blood Donors & Social Welfare Club", category: "SOCIAL_SERVICE", description: "Blood donation drives, winter clothes campaigns and community service." },
];

const STAFF_SLOTS: ReadonlyArray<{ slot: number; role: SeedRole; name: string }> = [
  { slot: 1, role: "SUPER_ADMIN", name: "CampusOS Super Admin" },
  { slot: 2, role: "ADMIN", name: "CampusOS Admin" },
  { slot: 3, role: "CLUB_ADMIN", name: "Computer Club Admin" },
  { slot: 4, role: "MODERATOR", name: "CampusOS Moderator" },
];

/** Club the CLUB_ADMIN seed account administers. */
const CLUB_ADMIN_CLUB_SLUG = "cu-computer-club";

/** `local@domain` -> `local+tag@domain` (same inbox, distinct account). */
function plusAddress(email: string, tag: string): string {
  const [local, domain] = email.split("@");
  return `${local}+${tag}@${domain}`;
}

function collectAccounts(): SeedAccount[] {
  const accounts: SeedAccount[] = [];
  for (const { slot, role, name } of STAFF_SLOTS) {
    const email = process.env[`ADMIN${slot}_EMAIL`];
    const password = process.env[`ADMIN${slot}_PASSWORD`];
    if (email && password) accounts.push({ envPrefix: `ADMIN${slot}`, email, password, name, role });
  }

  const demoEmail = process.env.DEMO_USER_EMAIL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (demoEmail && demoPassword) {
    accounts.push(
      { envPrefix: "DEMO_USER", email: demoEmail, password: demoPassword, name: "Demo Student", role: "USER", studentId: "CU-DEMO-001", departmentCode: "CSE", batch: "58" },
      { envPrefix: "DEMO_USER", email: plusAddress(demoEmail, "2"), password: demoPassword, name: "Demo Student Two", role: "USER", studentId: "CU-DEMO-002", departmentCode: "BBA", batch: "60" },
    );
  }
  return accounts;
}

async function main(): Promise<void> {
  const [{ prisma }, { hashPassword, passwordSchema }, { logger }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/lib/auth/password"),
    import("../src/lib/logger"),
  ]);

  try {
    for (const department of DEPARTMENTS) {
      await prisma.department.upsert({
        where: { code: department.code },
        create: department,
        update: { name: department.name, faculty: department.faculty },
      });
    }
    const departmentIds = new Map(
      (await prisma.department.findMany({ select: { id: true, code: true } })).map((d) => [d.code, d.id]),
    );
    logger.info("Seeded departments", { count: DEPARTMENTS.length });

    for (const club of CLUBS) {
      await prisma.club.upsert({
        where: { slug: club.slug },
        create: club,
        update: { name: club.name, category: club.category, description: club.description },
      });
    }
    logger.info("Seeded clubs", { count: CLUBS.length });

    const accounts = collectAccounts();
    if (accounts.length === 0) logger.warn("No ADMINn_* / DEMO_USER_* variables set - skipping accounts.");

    for (const account of accounts) {
      const policy = passwordSchema.safeParse(account.password);
      if (!policy.success) {
        throw new Error(`${account.envPrefix}_PASSWORD does not meet the password policy: ${policy.error.issues[0]?.message}`);
      }
      const email = account.email.trim().toLowerCase();
      const departmentId = account.departmentCode ? departmentIds.get(account.departmentCode) ?? null : null;
      const profile = {
        name: account.name,
        role: account.role,
        isEmailVerified: true,
        isActive: true,
        deletedAt: null,
        studentId: account.studentId ?? null,
        departmentId,
        batch: account.batch ?? null,
      };

      await prisma.user.upsert({
        where: { email },
        // Password is only set on first creation, never reset by a re-run.
        create: { ...profile, email, emailVerifiedAt: new Date(), passwordHash: await hashPassword(account.password) },
        update: profile,
        select: { id: true },
      });
      logger.info("Seeded account", { role: account.role, source: account.envPrefix });
    }

    const clubAdmin = await prisma.user.findFirst({ where: { role: "CLUB_ADMIN" }, select: { id: true } });
    const adminClub = await prisma.club.findUnique({ where: { slug: CLUB_ADMIN_CLUB_SLUG }, select: { id: true } });
    if (clubAdmin && adminClub) {
      await prisma.clubMember.upsert({
        where: { userId_clubId: { userId: clubAdmin.id, clubId: adminClub.id } },
        create: { userId: clubAdmin.id, clubId: adminClub.id, role: "ADMIN" },
        update: { role: "ADMIN" },
      });
    }

    // Recompute the denormalized member counters from the source of truth.
    await prisma.$executeRaw`
      UPDATE "Club" c SET "memberCount" = (SELECT COUNT(*) FROM "ClubMember" m WHERE m."clubId" = c.id)`;

    const { seedContent } = await import("./seed-content");
    await seedContent(prisma, logger);
    const { seedCampusContent } = await import("./seed-campus");
    await seedCampusContent(prisma, logger);

    logger.info("Seed completed");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

// Module scope: keeps `main` from clashing with other scripts during type-checking.
export {};
