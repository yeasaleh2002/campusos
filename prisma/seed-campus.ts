/**
 * Demo content for Task 4: helpdesk knowledge base, bus routes, notices, forms
 * and lost & found posts. Idempotent (upserts by natural keys).
 *
 * EVERY knowledge-base entry here is SAMPLE DATA (isSample = true): realistic
 * placeholders that an admin must verify against official City University
 * policy before relying on them. The chatbot labels answers drawn from them.
 */
import { BUS_SERVICE_DAYS, WORKING_DAYS, describeOffDays, describeWorkingDays, weekdayName } from "../src/config/campus-calendar";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { KnowledgeCategory, LostFoundCategory, NoticeCategory } from "../src/generated/prisma/enums";

type Logger = { info: (message: string, context?: Record<string, unknown>) => void };
type Entry = [category: KnowledgeCategory, question: string, answer: string, keywords: string[]];

const KB: Entry[] = [
  // ───── BUS ─────
  ["BUS", "Is the university bus free for students?", "Yes. The university bus service is free for enrolled students who show a valid City University ID card when boarding.", ["bus", "free", "fare", "transport", "shuttle", "gari"]],
  ["BUS", "How do I get a transport pass?", "Collect a transport pass from the Transport Office (Admin Building, ground floor) with your ID card and a passport-size photo. Passes are issued within two working days.", ["bus", "pass", "transport", "card"]],
  ["BUS", "Where is the Transport Office?", "The Transport Office is on the ground floor of the Admin Building, open {{WORKING}}, 9:00 AM to 4:00 PM.", ["transport", "office", "bus"]],
  ["BUS", "Do buses run on {{OFF}}?", "No. Buses run {{WORKING}} only. There is no bus service on {{OFF}} (weekly off days) or on university holidays. The next bus after an off day is the first trip on {{FIRST}}.", ["bus", "wednesday", "thursday", "off day", "holiday", "schedule", "chuti", "বুধবার", "বৃহস্পতিবার", "budhbar", "budhobar", "brihospotibar", "bihospotibar", "bihaspotibar", "shukrobar"]],
  ["BUS", "Which days does the university bus run?", "The university bus runs {{WORKING}}. It does not run on {{OFF}} (weekly off days) or on special closures announced in notices.", ["bus", "days", "schedule", "friday", "saturday", "sunday", "monday", "tuesday", "kon din"]],
  ["BUS", "Do buses run on {{FIRST}}?", "Yes. {{FIRST}} is a normal working day at City University, so buses run on {{FIRST}} like on every other working day ({{WORKING}}). Only {{OFF}} have no bus service.", ["bus", "friday", "shukrobar", "শুক্রবার", "run", "service", "cholbe"]],
  ["BUS", "Do buses run on Saturday, Sunday, Monday and Tuesday?", "Yes. Buses run on every working day: {{WORKING}}. The only days without a bus are {{OFF}} (weekly off days) and special closures announced as notices.", ["bus", "saturday", "sunday", "monday", "tuesday", "run", "days", "service"]],
  ["BUS", "Is there a bus on a public holiday or special closure?", "No. When the university is closed for a public holiday or a special closure, the bus service is suspended too. CampusOS shows \"No bus service today\" on the Bus page and tells you the next day a bus runs.", ["bus", "holiday", "closure", "closed", "service", "chuti", "ছুটি"]],
  ["BUS", "What should I do on {{OFF}} if I need to travel to campus?", "The university is closed and buses do not run on {{OFF}}. Plan your visit for {{FIRST}} or another working day ({{WORKING}}). The Bus page always shows the next day with a bus.", ["bus", "wednesday", "thursday", "off day", "travel", "next", "plan"]],
  ["BUS", "What happens if I miss the last bus from campus?", "The last scheduled bus leaves campus at about 5:30 PM. After that, use public transport from Birulia or Ashulia; the university does not run late-night buses except during exam weeks when announced.", ["bus", "last", "late", "campus"]],
  ["BUS", "Can I bring a guest on the university bus?", "No. University buses are for students, faculty and staff with a valid ID card only.", ["bus", "guest", "visitor"]],
  ["BUS", "How do I report a problem with a bus or driver?", "Report it through CampusOS Complaints (category: Transport) with the route code, time and date. Urgent safety issues should also be reported to the Transport Office immediately.", ["bus", "complaint", "driver", "transport"]],
  ["BUS", "Are bus timings different during exams?", "During midterm and final exam weeks the Transport Office may add extra trips. Check the Notices page and the bus schedule in CampusOS for exam-week timings.", ["bus", "exam", "timing", "schedule"]],
  ["BUS", "Where can I see the live bus schedule?", "Open the Bus page in CampusOS or ask the assistant \"next bus to <your area>\" for the next departures, calculated in Bangladesh time.", ["bus", "schedule", "live", "next"]],
  ["BUS", "What should I do if I lost something on the bus?", "Report it on CampusOS Lost & Found and inform the Transport Office with the route code and trip time. Items found on buses are kept at the Transport Office for 30 days.", ["bus", "lost", "found", "item"]],

  // ───── RULES ─────
  ["RULES", "What is the minimum class attendance requirement?", "Students must attend at least 75% of classes in each course. Students below 75% may be barred from the final exam unless the department approves an exception.", ["attendance", "class", "hajira", "percentage", "rule"]],
  ["RULES", "What happens if my attendance is below 75%?", "You may not be allowed to sit for the final exam of that course. You can apply to the department head with valid documents (for example a medical certificate) for consideration.", ["attendance", "below", "final", "exam", "barred"]],
  ["RULES", "Is there a dress code on campus?", "Students are expected to wear decent, modest attire on campus. Some labs require closed shoes and lab coats.", ["dress", "code", "attire", "rule"]],
  ["RULES", "Is smoking allowed on campus?", "No. City University is a smoke-free campus. Smoking is prohibited in all buildings, classrooms and campus grounds.", ["smoking", "rule", "campus"]],
  ["RULES", "What is the policy on ragging and harassment?", "Ragging and any form of harassment are strictly prohibited and lead to disciplinary action, including expulsion. Report incidents confidentially through CampusOS Complaints (you can choose anonymous).", ["ragging", "harassment", "rule", "complaint"]],
  ["RULES", "What counts as academic dishonesty?", "Copying in exams, plagiarism in assignments, using unauthorised materials and impersonation are academic dishonesty. Penalties range from zero marks to expulsion.", ["plagiarism", "cheating", "exam", "rule"]],
  ["RULES", "Can I use my phone during exams?", "No. Mobile phones and smart watches must be switched off and kept outside the exam seat. Possession during an exam is treated as an unfair means case.", ["phone", "mobile", "exam", "rule"]],
  ["RULES", "What is the credit load per semester?", "A regular undergraduate student usually takes 12 to 18 credits per semester. Taking more than 18 credits needs the advisor's approval.", ["credit", "load", "semester", "registration"]],
  ["RULES", "How many times can I retake a course?", "A failed course can be retaken in a later semester. The better grade is counted, subject to the department's improvement policy.", ["retake", "improvement", "course", "grade"]],
  ["RULES", "What is the grading system?", "City University uses a 4.00 CGPA scale: A+ (80-100) = 4.00, A (75-79) = 3.75, A- (70-74) = 3.50, B+ (65-69) = 3.25, B (60-64) = 3.00, B- (55-59) = 2.75, C+ (50-54) = 2.50, C (45-49) = 2.25, D (40-44) = 2.00, F (<40) = 0.00.", ["grade", "cgpa", "gpa", "result", "scale"]],
  ["RULES", "What is the minimum CGPA to graduate?", "You need a minimum CGPA of 2.50 with all required credits completed to graduate.", ["cgpa", "graduate", "minimum", "result"]],
  ["RULES", "Can I drop a course after registration?", "Yes, you can drop a course within the add/drop period announced each semester (usually the first two weeks). After that, a withdrawal needs the department's approval.", ["drop", "course", "registration", "add"]],
  ["RULES", "Is ID card mandatory on campus?", "Yes. Students must carry their ID card on campus and show it on request, when boarding buses, entering the library and during exams.", ["id", "card", "mandatory", "rule"]],
  ["RULES", "What is the policy on late assignment submission?", "Late submission rules are set by each course teacher and stated in the course outline. Commonly marks are deducted per day late.", ["assignment", "late", "submission"]],
  ["RULES", "How are disciplinary cases handled?", "Disciplinary cases are reviewed by the Proctorial Body. Students are informed in writing and have the right to be heard before a decision.", ["discipline", "proctor", "rule"]],
  ["RULES", "Can I change my department?", "Department change is possible after the first semester if seats are available and you meet the target department's requirements. Apply to the Registrar's Office.", ["department", "change", "transfer", "registrar"]],

  // ───── EXAM ─────
  ["EXAM", "When are midterm exams held?", "Midterm exams are usually held around week 7-8 of the semester. The exact routine is published on the Notices page.", ["exam", "midterm", "mid", "schedule", "porikkha"]],
  ["EXAM", "When are final exams held?", "Final exams are held at the end of each semester, usually in the last two weeks. The final exam routine is published on the Notices page about two weeks before.", ["exam", "final", "schedule", "routine"]],
  ["EXAM", "What do I need to bring to the exam hall?", "Bring your student ID card, admit card, pens, and an approved calculator if allowed. Bags and phones must be left outside the seat.", ["exam", "admit", "card", "bring", "hall"]],
  ["EXAM", "How do I get my admit card?", "Admit cards are issued after you clear your semester fees. Download it from the student portal or collect it from the Exam Office.", ["exam", "admit", "card", "fee"]],
  ["EXAM", "What if I miss an exam due to illness?", "Submit a medical certificate to the department within 3 working days of the exam. If approved, you may sit for a make-up exam.", ["exam", "miss", "illness", "medical", "makeup"]],
  ["EXAM", "How can I apply for a re-scrutiny of my exam script?", "Apply to the Exam Office within 7 days of result publication with the re-scrutiny fee. Re-scrutiny checks totals and unmarked answers.", ["exam", "rescrutiny", "result", "recheck"]],
  ["EXAM", "When are results published?", "Semester results are usually published within 3-4 weeks after the final exam ends. You will see them on the student portal.", ["result", "exam", "publish", "grade"]],
  ["EXAM", "Is a calculator allowed in exams?", "Only non-programmable scientific calculators (for example Casio fx-991) are allowed, and only where the course teacher permits.", ["calculator", "exam", "allowed"]],
  ["EXAM", "How early should I reach the exam hall?", "Reach the exam hall at least 15 minutes before the start time. Late entry after 30 minutes is not allowed.", ["exam", "time", "late", "hall"]],
  ["EXAM", "What is the improvement exam?", "An improvement exam lets you retake a course exam to improve a low grade. Apply during the improvement exam registration announced by the Exam Office.", ["improvement", "exam", "retake", "grade"]],
  ["EXAM", "How are class tests counted?", "Class tests (CT) are part of continuous assessment. Usually the best class tests are counted together with attendance and assignments.", ["class", "test", "ct", "assessment", "exam"]],
  ["EXAM", "Where is the Exam Office?", "The Exam Office (Controller of Examinations) is on the second floor of the Admin Building, open 9:00 AM to 4:00 PM, {{WORKING}}.", ["exam", "office", "controller"]],
  ["EXAM", "Can I sit for an exam without paying fees?", "No. You must clear the semester fees to get an admit card and sit for the final exam.", ["exam", "fee", "admit", "payment"]],
  ["EXAM", "What are the rules for exam seating?", "Seat plans are posted outside exam halls and on the Notices page before exams. Sit only in your assigned seat.", ["exam", "seat", "plan", "hall"]],

  // ───── ADMISSION ─────
  ["ADMISSION", "How do I apply for admission to City University?", "Apply online through the City University admission page or at the Admission Office. You need SSC and HSC certificates and transcripts, passport-size photos and the application fee.", ["admission", "apply", "vorti", "online"]],
  ["ADMISSION", "What are the admission requirements for undergraduate programs?", "Typically a combined SSC and HSC GPA of at least 6.00 with no less than 2.50 in either. Some programs (such as Engineering) require Science background with Mathematics.", ["admission", "requirement", "gpa", "ssc", "hsc"]],
  ["ADMISSION", "When does admission happen?", "City University admits students in the Spring, Summer and Fall intakes. Dates are announced on the website and the Notices page.", ["admission", "intake", "semester", "date"]],
  ["ADMISSION", "Are there scholarships or tuition waivers?", "Yes. Waivers are offered based on SSC/HSC results, semester CGPA, siblings studying at CU, and for freedom fighters' children, subject to university policy.", ["scholarship", "waiver", "admission", "britti"]],
  ["ADMISSION", "Can I transfer credits from another university?", "Credit transfer is possible for equivalent courses with grade B or above, subject to department evaluation. Apply to the Admission Office with transcripts and syllabi.", ["credit", "transfer", "admission"]],
  ["ADMISSION", "Is there an admission test?", "Some programs hold a written admission test and/or viva. The Admission Office announces the format for each intake.", ["admission", "test", "viva"]],
  ["ADMISSION", "Where is the Admission Office?", "The Admission Office is on the ground floor of the Admin Building, open every day during admission season.", ["admission", "office"]],
  ["ADMISSION", "Which documents are needed after admission?", "Submit original SSC and HSC certificates for verification, photocopies, passport-size photos and your NID or birth certificate.", ["admission", "documents", "certificate"]],
  ["ADMISSION", "Can international students apply?", "Yes. International students should contact the Admission Office for equivalence of qualifications and visa support documents.", ["admission", "international", "foreign"]],
  ["ADMISSION", "How do I pay the admission fee?", "Pay the admission fee at the designated bank booth or through the online payment options listed on the admission page.", ["admission", "fee", "payment"]],

  // ───── GENERAL ─────
  ["GENERAL", "What are the library opening hours?", "The Central Library is open {{WORKING}} from 8:00 AM to 8:00 PM. During exam weeks it may stay open until 10:00 PM.", ["library", "hours", "open", "time", "boi"]],
  ["GENERAL", "How many books can I borrow from the library?", "Undergraduate students can borrow up to 3 books for 14 days. Reference books cannot be borrowed.", ["library", "borrow", "book", "boi"]],
  ["GENERAL", "What is the fine for returning library books late?", "The late return fine is 5 taka per book per day. Lost books must be replaced or paid for.", ["library", "fine", "late", "book"]],
  ["GENERAL", "How do I get my student ID card?", "ID cards are issued by the Registrar's Office within the first month after admission. Bring your admission slip and a photo.", ["id", "card", "student", "registrar"]],
  ["GENERAL", "What should I do if I lose my ID card?", "Report it on CampusOS Lost & Found, then apply for a replacement at the Registrar's Office with a replacement fee and a GD copy if required.", ["id", "card", "lost", "replacement"]],
  ["GENERAL", "How do I connect to campus Wi-Fi?", "Connect to the \"CU-Student\" network and sign in with your student ID and portal password. Contact the IT Help Desk if you can't log in.", ["wifi", "internet", "network", "login"]],
  ["GENERAL", "Where is the IT Help Desk?", "The IT Help Desk is in the Academic Building 1 basement, open 9:00 AM to 5:00 PM, {{WORKING}}.", ["it", "help", "desk", "support"]],
  ["GENERAL", "Is there a medical centre on campus?", "Yes. The Medical Centre near the main gate offers first aid and basic consultation, 9:00 AM to 5:00 PM. In emergencies, call the campus emergency number posted at the main gate.", ["medical", "doctor", "health", "centre"]],
  ["GENERAL", "Does City University have a hostel?", "Limited hostel accommodation is available for students near campus. Apply to the Student Affairs Office; seats are allocated on a first-come basis.", ["hostel", "accommodation", "seat", "hall"]],
  ["GENERAL", "What food options are on campus?", "The central cafeteria and several food corners serve meals and snacks from 8:00 AM to 7:00 PM.", ["cafeteria", "food", "canteen", "khabar"]],
  ["GENERAL", "How do I join a club?", "Browse clubs on the CampusOS Clubs page and fill in the club's membership form listed under Forms & Deadlines, or visit the club desk during club week.", ["club", "join", "membership"]],
  ["GENERAL", "How do I register for an event?", "Open the event on CampusOS and tap Register. You'll get a QR ticket by email and in My Registrations; show it at the entrance.", ["event", "register", "qr", "ticket"]],
  ["GENERAL", "Where is the Registrar's Office?", "The Registrar's Office is on the first floor of the Admin Building, open 9:00 AM to 4:00 PM, {{WORKING}}.", ["registrar", "office", "admin"]],
  ["GENERAL", "Is there a prayer room on campus?", "Yes. There are separate prayer rooms for male and female students in Academic Building 1 and a central mosque on campus.", ["prayer", "mosque", "room"]],
  ["GENERAL", "Where can I print or photocopy documents?", "The photocopy and print shop beside the library offers printing, photocopying and binding at standard rates.", ["print", "photocopy", "shop"]],
  ["GENERAL", "How do I contact my academic advisor?", "Your advisor's name and office hours are on the student portal. You can also ask your department office.", ["advisor", "academic", "contact"]],
  ["GENERAL", "Is there a counselling service?", "Yes. The Student Counselling Unit offers free, confidential counselling. Book an appointment at the Student Affairs Office.", ["counselling", "mental", "health", "support"]],
  ["GENERAL", "Where can I find previous question papers?", "Previous question papers, notes and lab manuals are in the CampusOS Resource Hub. Search by course code, for example \"CSE 2101\".", ["question", "paper", "previous", "notes", "resource"]],

  // ───── FAQ ─────
  ["FAQ", "How do I pay my semester fees?", "Pay semester fees at the designated bank booths on campus or through the online payment methods on the student portal. Keep the receipt.", ["fee", "payment", "tuition", "beton", "semester"]],
  ["FAQ", "What is the deadline for paying semester fees?", "Fees are usually due in instalments before the midterm and before the final exam. Exact dates are announced each semester on the Notices page.", ["fee", "deadline", "payment", "instalment"]],
  ["FAQ", "Can I pay fees in instalments?", "Yes. Semester fees can usually be paid in instalments as announced by the Accounts Office.", ["fee", "instalment", "payment", "accounts"]],
  ["FAQ", "How do I get my transcript or certificate?", "Apply at the Registrar's Office with the required fee. Provisional certificates usually take 3-5 working days; transcripts may take longer.", ["transcript", "certificate", "registrar"]],
  ["FAQ", "How do I register for courses?", "Course registration opens before each semester. Register on the student portal after meeting your advisor, then pay the registration fee.", ["registration", "course", "semester", "portal"]],
  ["FAQ", "I forgot my CampusOS password. What should I do?", "Use \"Forgot password\" on the CampusOS sign-in page. We'll email you a 6-digit code to set a new password.", ["password", "forgot", "reset", "campusos"]],
  ["FAQ", "How do I file a complaint?", "Go to CampusOS Complaints, choose a category and describe the issue. You'll get a ticket number (like CU-2026-000123) to track progress. You can file anonymously.", ["complaint", "file", "ticket", "ovijog"]],
  ["FAQ", "Can I submit a complaint anonymously?", "Yes. Tick \"Submit anonymously\" and staff won't see your identity. You can still track the ticket from your account.", ["complaint", "anonymous", "privacy"]],
  ["FAQ", "How do I report a lost item?", "Post it on CampusOS Lost & Found with a description, location and time. You'll be notified if someone claims or reports a matching found item.", ["lost", "found", "report", "item"]],
  ["FAQ", "How do I claim a found item?", "Open the found item on CampusOS Lost & Found and submit a claim describing it. The reporter verifies it before sharing contact details.", ["found", "claim", "lost", "item"]],
  ["FAQ", "How do I upload notes to the Resource Hub?", "Open the Resource Hub, choose Upload, attach a PDF and fill in the course details. A moderator reviews it before it goes live.", ["upload", "notes", "resource", "pdf"]],
  ["FAQ", "Who can I contact for CampusOS problems?", "Use the Complaints section with category IT Services, or contact the IT Help Desk.", ["campusos", "help", "support", "it"]],
  ["FAQ", "How do I get notified about notices for my department?", "Follow your department and courses in CampusOS. You'll get in-app notifications when new notices are posted for them.", ["notice", "follow", "department", "notification"]],
  ["GENERAL", "Which days is the university open?", "City University is open {{WORKING}}. {{OFF}} are the weekly off days, when classes and offices are closed and there is no bus service. Public holidays and special closures are announced as notices.", ["open", "working days", "days", "university", "khola", "friday", "saturday", "sunday", "monday", "tuesday"]],
  ["GENERAL", "Is the university open on {{OFF}}?", "No. {{OFF}} are the weekly off days (ছুটি), so classes and offices are closed and buses do not run. The campus reopens on {{FIRST}}.", ["wednesday", "thursday", "off day", "holiday", "closed", "chuti", "বুধবার", "বৃহস্পতিবার", "ছুটি", "bondho", "budhbar", "budhobar", "brihospotibar", "bihospotibar", "bihaspotibar", "shukrobar"]],
  ["GENERAL", "Is the university open on {{FIRST}}?", "Yes. {{FIRST}} is a normal working day: classes, offices, the library and the bus service all run, the same as on the other working days ({{WORKING}}).", ["friday", "shukrobar", "শুক্রবার", "open", "working day", "class", "khola"]],
  ["GENERAL", "Is the university open on weekends?", "City University's weekly off days are {{OFF}}, not the usual weekend. {{WORKING}} are working days, so classes, offices and buses run on Friday and Saturday too.", ["weekend", "friday", "saturday", "off day", "holiday", "chuti", "open"]],
  ["GENERAL", "Are there classes on {{OFF}}?", "No. There are no classes and the offices are closed on {{OFF}}. Exams and events are not scheduled on those days unless a notice says otherwise.", ["class", "wednesday", "thursday", "off day", "closed", "exam", "budhbar", "brihospotibar"]],
  ["GENERAL", "What happens when a public holiday falls on a working day?", "The university and the bus service close for that day. The holiday is added to the CampusOS campus calendar and announced as a notice, and the Bus page and the assistant answer \"closed\" for that date.", ["public", "holiday", "closure", "calendar", "closed", "chuti", "ছুটি"]],
  ["GENERAL", "How do I know if the university is open today?", "Ask the assistant \"Is the university open today?\" or open the Bus page. CampusOS knows the weekly off days ({{OFF}}) and every announced holiday, and answers in Bangladesh time.", ["open", "today", "tomorrow", "calendar", "check", "ajke", "কাল"]],
  ["GENERAL", "What are the weekly off days?", "The weekly off days are {{OFF}}. The university is open {{WORKING}}.", ["weekly off", "off day", "holiday", "weekend", "chuti", "ছুটি", "budhbar", "budhobar", "brihospotibar", "bihospotibar", "bihaspotibar", "shukrobar"]],
  ["FAQ", "When does the semester start?", "City University runs Spring (January), Summer (May) and Fall (September) semesters. Exact start dates are on the academic calendar and Notices page.", ["semester", "start", "calendar", "class"]],
];

const WORKING = describeWorkingDays();
const OFF = describeOffDays();
const FIRST = weekdayName(WORKING_DAYS[0]);
const fillDays = (text: string) => text.replaceAll("{{WORKING}}", WORKING).replaceAll("{{OFF}}", OFF).replaceAll("{{FIRST}}", FIRST);
const CAMPUS = "City University Campus (Khagan, Birulia)";

const ROUTES = [
  { code: "R1", name: "Dhanmondi", stops: [["Dhanmondi 27", 0], ["Kalabagan", 8], ["Science Lab", 15], ["Shyamoli", 30], ["Gabtoli", 40], ["Amin Bazar", 50], ["Birulia Bazar", 65], [CAMPUS, 75]], to: ["07:00", "08:30", "11:30"], from: ["13:30", "15:30", "17:30"] },
  { code: "R2", name: "Mirpur", stops: [["Mirpur 10", 0], ["Mirpur 1", 12], ["Technical", 20], ["Gabtoli", 30], ["Amin Bazar", 40], ["Birulia Bazar", 55], [CAMPUS, 65]], to: ["07:15", "08:45", "11:45"], from: ["13:30", "15:30", "17:30"] },
  { code: "R3", name: "Uttara", stops: [["Uttara House Building", 0], ["Abdullahpur", 10], ["Kamarpara", 25], ["Ashulia Bazar", 40], ["Birulia Bazar", 55], [CAMPUS, 65]], to: ["07:00", "08:30"], from: ["14:00", "17:00"] },
  { code: "R4", name: "Farmgate", stops: [["Farmgate", 0], ["Shyamoli", 15], ["Gabtoli", 25], ["Amin Bazar", 35], ["Birulia Bazar", 50], [CAMPUS, 60]], to: ["07:30", "09:00"], from: ["13:30", "16:30"] },
  { code: "R5", name: "Mohammadpur", stops: [["Mohammadpur Bus Stand", 0], ["Asad Gate", 8], ["Shyamoli", 15], ["Gabtoli", 25], ["Birulia Bazar", 50], [CAMPUS, 60]], to: ["07:20", "08:50"], from: ["14:00", "17:00"] },
  { code: "R6", name: "Savar", stops: [["Savar Bus Stand", 0], ["Hemayetpur", 12], ["Birulia Bazar", 30], [CAMPUS, 40]], to: ["07:45", "09:15", "12:00"], from: ["13:00", "15:00", "17:30"] },
] as const;

const NOTICES: Array<{ title: string; body: string; category: NoticeCategory; dept?: string; course?: string; pinned?: boolean; daysAgo: number }> = [
  { title: "Midterm Exam Schedule - Fall 2026", body: "Midterm exams for all undergraduate programs will be held from 19 to 26 October 2026. Department-wise routines and seat plans are posted outside each department office. Bring your ID card and admit card.", category: "EXAM", pinned: true, daysAgo: 1 },
  { title: "Final Exam Form Fill-up Deadline", body: "Final exam form fill-up for Fall 2026 must be completed on the student portal by 20 November 2026 after clearing semester dues. Late fill-up carries a fine.", category: "EXAM", daysAgo: 3 },
  { title: "CSE-3201 (Operating Systems) class cancelled today", body: "Today's CSE-3201 Section A class is cancelled due to the course teacher's official engagement. A make-up class will be announced later.", category: "CLASS_CANCELLATION", dept: "CSE", course: "CSE-3201", daysAgo: 0 },
  { title: "BBA-2201 Business Statistics class rescheduled", body: "The BBA-2201 class of Tuesday is cancelled and moved to Sunday 10:00 AM, Room 402.", category: "CLASS_CANCELLATION", dept: "BBA", course: "BBA-2201", daysAgo: 2 },
  { title: "Campus closed on 16 December (Victory Day)", body: "The university will remain closed on 16 December 2026 on the occasion of Victory Day. Bus service will not run.", category: "GENERAL", pinned: true, daysAgo: 4 },
  { title: "Library hours extended during exams", body: "The Central Library will stay open until 10:00 PM from 15 October to 30 October 2026 for exam preparation.", category: "GENERAL", daysAgo: 5 },
  { title: "Urgent: Power maintenance in Academic Building 2", body: "Due to power maintenance, labs in Academic Building 2 will be unavailable on Sunday from 9:00 AM to 1:00 PM. Affected lab classes are cancelled.", category: "URGENT", daysAgo: 1 },
  { title: "Semester fee 2nd instalment deadline", body: "The second instalment of Fall 2026 semester fees is due by 31 October 2026. Pay at the campus bank booths or online.", category: "FORM_DEADLINE", daysAgo: 6 },
];

const FORMS = [
  { title: "Spring 2027 Course Pre-registration", description: "Pre-register your Spring 2027 courses before advising week.", days: 21, club: null },
  { title: "Programming Club Membership (Fall 2026)", description: "Join CU Programming & Problem Solving Club.", days: 10, club: "cu-programming-club" },
  { title: "Blood Donation Camp Volunteer Sign-up", description: "Volunteer for the upcoming Blood Donation Camp.", days: 5, club: "cu-blood-donors-club" },
  { title: "Inter-University Hackathon Team Registration", description: "Register your team of three for the hackathon.", days: 14, club: "cu-computer-club" },
  { title: "Transport Pass Application", description: "Apply for a university bus pass.", days: null, club: null },
];

const LOST_FOUND: Array<{ type: "LOST" | "FOUND"; title: string; description: string; category: LostFoundCategory; location: string; daysAgo: number }> = [
  { type: "LOST", title: "Black leather wallet", description: "Black leather wallet with my NID and some cash, lost near the central cafeteria around lunch.", category: "WALLET", location: "Central cafeteria", daysAgo: 1 },
  { type: "FOUND", title: "Black wallet found near library", description: "Found a black leather wallet on the library stairs. Describe the contents to claim it.", category: "WALLET", location: "Library staircase", daysAgo: 1 },
  { type: "LOST", title: "Casio fx-991ES calculator", description: "Lost my Casio fx-991ES scientific calculator after the CSE midterm in Room 305.", category: "ELECTRONICS", location: "Room 305, Academic Building 1", daysAgo: 3 },
  { type: "FOUND", title: "Keys with a red keychain", description: "A bunch of 3 keys with a red keychain found on bus R2 (morning trip).", category: "KEYS", location: "Bus R2", daysAgo: 2 },
  { type: "LOST", title: "Student ID card (CSE, batch 58)", description: "Lost my student ID card somewhere between the main gate and Academic Building 2.", category: "ID_CARD", location: "Main gate", daysAgo: 4 },
  { type: "FOUND", title: "Blue water bottle", description: "Blue steel water bottle left in the Seminar Hall after the AI seminar.", category: "OTHER", location: "Seminar Hall", daysAgo: 5 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export async function seedCampusContent(prisma: PrismaClient, logger: Logger): Promise<void> {
  const { syncBusRouteKnowledge, syncNoticeKnowledge } = await import("../src/server/services/knowledge-sync.service");
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  if (!admin) return;

  // Knowledge base (sample data, admins must verify).
  for (const [category, question, answer, keywords] of KB) {
    const existing = await prisma.knowledgeEntry.findFirst({ where: { question: fillDays(question), sourceType: "MANUAL" }, select: { id: true } });
    const data = { category, question: fillDays(question), answer: fillDays(answer), keywords, isPublished: true, isSample: true, deletedAt: null };
    if (existing) await prisma.knowledgeEntry.update({ where: { id: existing.id }, data });
    else await prisma.knowledgeEntry.create({ data: { ...data, sourceType: "MANUAL", createdById: admin.id } });
  }
  // Retire sample entries that an older seed wrote and this one no longer has (for example the old "Do buses run on
  // Friday?" answer from before the calendar rule). Entries an admin wrote or edited are never sample entries.
  const current = KB.map(([, question]) => fillDays(question));
  const retired = await prisma.knowledgeEntry.updateMany({ where: { sourceType: "MANUAL", isSample: true, deletedAt: null, question: { notIn: current } }, data: { deletedAt: new Date(), isPublished: false } });
  logger.info("Seeded knowledge base (sample)", { count: KB.length, retired: retired.count });

  // Bus routes + trips; regenerated KB entries.
  for (const route of ROUTES) {
    const stops = route.stops.map(([name, offsetMinutes]) => ({ name, offsetMinutes }));
    const notes = "Free for students with a valid ID card. Sample timetable - verify with the Transport Office.";
    const saved = await prisma.busRoute.upsert({
      where: { code: route.code },
      create: { code: route.code, name: route.name, stops, notes },
      update: { name: route.name, stops, notes, isActive: true, deletedAt: null },
      select: { id: true },
    });
    await prisma.busTrip.deleteMany({ where: { routeId: saved.id } });
    await prisma.busTrip.createMany({
      data: [
        ...route.to.map((departureTime) => ({ routeId: saved.id, departureTime, direction: "TO_CAMPUS" as const, daysOfWeek: [...BUS_SERVICE_DAYS] })),
        ...route.from.map((departureTime) => ({ routeId: saved.id, departureTime, direction: "FROM_CAMPUS" as const, daysOfWeek: [...BUS_SERVICE_DAYS] })),
      ],
    });
    await syncBusRouteKnowledge(saved.id);
  }
  logger.info("Seeded bus routes", { count: ROUTES.length });

  // A sample special closure (public holiday) so the campus calendar and bus pages have real data.
  const victoryDay = new Date("2026-12-16T00:00:00Z");
  await prisma.campusClosure.upsert({
    where: { date: victoryDay },
    create: { date: victoryDay, title: "Victory Day", closesCampus: true, suspendsBus: true, note: "Sample data: verify against the official university calendar.", createdById: admin.id },
    update: {},
  });

  // Notices (EXAM ones are mirrored into the knowledge base).
  const departments = new Map((await prisma.department.findMany({ select: { id: true, code: true } })).map((d) => [d.code, d.id]));
  const courses = new Map((await prisma.course.findMany({ select: { id: true, code: true } })).map((c) => [c.code, c.id]));
  for (const notice of NOTICES) {
    const data = {
      title: notice.title,
      body: notice.body,
      category: notice.category,
      pinned: notice.pinned ?? false,
      departmentId: notice.dept ? (departments.get(notice.dept) ?? null) : null,
      courseId: notice.course ? (courses.get(notice.course) ?? null) : null,
      createdAt: new Date(Date.now() - notice.daysAgo * DAY_MS),
      deletedAt: null,
    };
    const existing = await prisma.notice.findFirst({ where: { title: notice.title }, select: { id: true } });
    const saved = existing
      ? await prisma.notice.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.notice.create({ data: { ...data, createdById: admin.id }, select: { id: true } });
    await syncNoticeKnowledge(saved.id);
  }
  logger.info("Seeded notices", { count: NOTICES.length });

  // Forms (placeholder example.com URLs - replace with real Google Form links).
  const clubs = new Map((await prisma.club.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  for (const [i, form] of FORMS.entries()) {
    const data = {
      title: form.title,
      description: form.description,
      url: `https://example.com/campusos-sample-form-${i + 1}`,
      deadline: form.days === null ? null : new Date(Date.now() + form.days * DAY_MS),
      clubId: form.club ? (clubs.get(form.club) ?? null) : null,
      isOpen: true,
      deletedAt: null,
    };
    const existing = await prisma.formLink.findFirst({ where: { title: form.title }, select: { id: true } });
    if (existing) await prisma.formLink.update({ where: { id: existing.id }, data });
    else await prisma.formLink.create({ data: { ...data, createdById: admin.id } });
  }
  logger.info("Seeded forms", { count: FORMS.length });

  // Lost & found posts by the demo students.
  const students = await prisma.user.findMany({ where: { studentId: { in: ["CU-DEMO-001", "CU-DEMO-002"] } }, select: { id: true }, orderBy: { studentId: "asc" } });
  if (students.length > 0) {
    for (const [i, post] of LOST_FOUND.entries()) {
      const reporterId = students[i % students.length].id;
      const data = {
        type: post.type,
        title: post.title,
        description: post.description,
        category: post.category,
        locationText: post.location,
        occurredAt: new Date(Date.now() - post.daysAgo * DAY_MS),
        status: "OPEN" as const,
        deletedAt: null,
      };
      const existing = await prisma.lostFoundItem.findFirst({ where: { title: post.title, reporterId }, select: { id: true } });
      if (existing) await prisma.lostFoundItem.update({ where: { id: existing.id }, data });
      else await prisma.lostFoundItem.create({ data: { ...data, reporterId } });
    }
    logger.info("Seeded lost & found posts", { count: LOST_FOUND.length });
  }
}
