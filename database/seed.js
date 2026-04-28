import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, initializeDatabase } from "../backend/src/db.js";
import { deals, sampleUsers } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const colleges = JSON.parse(fs.readFileSync(path.join(__dirname, "colleges.json"), "utf8"));
const verifiedBreaksPath = path.join(__dirname, "college_breaks.verified.json");
const verifiedBreakDataset = fs.existsSync(verifiedBreaksPath)
  ? JSON.parse(fs.readFileSync(verifiedBreaksPath, "utf8"))
  : [];

initializeDatabase();

db.exec(`
  DELETE FROM notifications;
  DELETE FROM messages;
  DELETE FROM ride_memberships;
  DELETE FROM ride_posts;
  DELETE FROM flight_plan_participants;
  DELETE FROM flight_plans;
  DELETE FROM flights;
  DELETE FROM friends;
  DELETE FROM trip_participants;
  DELETE FROM trip_plans;
  DELETE FROM breaks;
  DELETE FROM deals;
  DELETE FROM users;
  DELETE FROM colleges;
`);

const insertCollege = db.prepare(
  `INSERT INTO colleges (name, city, state, airport_code, airport_name, airport_distance_miles)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const insertBreak = db.prepare(
  `INSERT INTO breaks (college_id, break_name, start_date, end_date, source_url)
   VALUES (?, ?, ?, ?, ?)`
);

const insertDeal = db.prepare(
  `INSERT INTO deals (title, description, link, expiration_date, applicable_colleges)
   VALUES (?, ?, ?, ?, ?)`
);

const insertUser = db.prepare(
  `INSERT INTO users (first_name, last_name, email, password_hash, college_id, home_airport, is_verified, role)
   VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
);

const insertRide = db.prepare(
  `INSERT INTO ride_posts
   (college_id, creator_id, trip_plan_id, flight_id, departure_airport, departure_datetime, seats_available, cost_split, meeting_location, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertMembership = db.prepare(
  `INSERT INTO ride_memberships (ride_id, user_id, status)
   VALUES (?, ?, 'joined')`
);

const insertTrip = db.prepare(
  `INSERT INTO trip_plans
   (user_id, creator_id, college_id, break_id, title, start_date, end_date, destination, notes, is_shared)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertParticipant = db.prepare(
  `INSERT INTO trip_participants (trip_id, user_id)
   VALUES (?, ?)`
);

const insertFriend = db.prepare(
  `INSERT INTO friends (requester_id, receiver_id, status)
   VALUES (?, ?, ?)`
);

const insertNotification = db.prepare(
  `INSERT INTO notifications (user_id, type, title, body, reference_id)
   VALUES (?, ?, ?, ?, ?)`
);

const insertFlight = db.prepare(
  `INSERT INTO flights
   (break_id, college_id, departure_airport, arrival_airport, depart_date, return_date, airline, flight_number, price, travel_class)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertFlightPlan = db.prepare(
  `INSERT INTO flight_plans
   (creator_id, break_id, flight_id, title, departure_airport, destination, selected_flight, start_date, end_date, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertFlightPlanParticipant = db.prepare(
  `INSERT INTO flight_plan_participants (flight_plan_id, user_id)
   VALUES (?, ?)`
);

for (const college of colleges) {
  insertCollege.run(
    college.name,
    college.city,
    college.state,
    college.airportCode,
    college.airportName,
    college.airportDistanceMiles
  );
}

const allColleges = db.prepare("SELECT id, name FROM colleges").all();
const collegeMap = new Map(allColleges.map((college) => [college.name, college.id]));

let insertedBreakCount = 0;
const verifiedBreaksBySchool = new Map(
  Array.isArray(verifiedBreakDataset)
    ? verifiedBreakDataset
        .filter((school) => school && school.status === "verified" && school.school && Array.isArray(school.breaks))
        .map((school) => [school.school, school.breaks])
    : []
);

for (const college of allColleges) {
  const breaksForCollege = verifiedBreaksBySchool.get(college.name) || [];
  for (const campusBreak of breaksForCollege) {
    insertBreak.run(
      college.id,
      campusBreak.display_name,
      campusBreak.start_date,
      campusBreak.end_date,
      campusBreak.source || null
    );
    insertedBreakCount += 1;
  }
}

for (const deal of deals) {
  let applicableCollegeIds = null;
  if (Array.isArray(deal.applicableColleges)) {
    applicableCollegeIds = deal.applicableColleges
      .map((name) => collegeMap.get(name))
      .filter(Boolean)
      .join(",");
  }

  insertDeal.run(deal.title, deal.description, deal.link, deal.expirationDate, applicableCollegeIds);
}

const userIds = [];
for (const user of sampleUsers) {
  const passwordHash = await bcrypt.hash(user.password, 10);
  const result = insertUser.run(
    user.firstName,
    user.lastName,
    user.email,
    passwordHash,
    collegeMap.get(user.collegeName),
    user.homeAirport,
    user.role
  );
  userIds.push(result.lastInsertRowid);
}

const demoRides = [
  {
    collegeName: "University of Texas at Austin",
    creatorId: userIds[1],
    tripPlanId: null,
    flightId: null,
    departureAirport: "AUS",
    departureDateTime: "2026-11-24T16:30",
    seatsAvailable: 3,
    costSplit: "$18 per rider",
    meetingLocation: "PCL Library front entrance",
    notes: "Leaving early for Thanksgiving flights. Light luggage preferred."
  },
  {
    collegeName: "University of Michigan",
    creatorId: userIds[2],
    tripPlanId: null,
    flightId: null,
    departureAirport: "DTW",
    departureDateTime: "2026-12-18T08:00",
    seatsAvailable: 4,
    costSplit: "$22 per rider",
    meetingLocation: "Michigan Union circle",
    notes: "SUV with room for four checked bags."
  },
  {
    collegeName: "University of North Carolina at Chapel Hill",
    creatorId: userIds[3],
    tripPlanId: null,
    flightId: null,
    departureAirport: "RDU",
    departureDateTime: "2027-03-08T07:15",
    seatsAvailable: 2,
    costSplit: "$15 per rider",
    meetingLocation: "Student Stores bus stop",
    notes: "Perfect for spring break morning departures."
  }
];

for (const ride of demoRides) {
  insertRide.run(
    collegeMap.get(ride.collegeName),
    ride.creatorId,
    ride.tripPlanId,
    ride.flightId,
    ride.departureAirport,
    ride.departureDateTime,
    ride.seatsAvailable,
    ride.costSplit,
    ride.meetingLocation,
    ride.notes
  );
}



insertFriend.run(userIds[1], userIds[2], "accepted");
insertFriend.run(userIds[1], userIds[3], "pending");

const sharedTrip = insertTrip.run(
  userIds[1],
  userIds[1],
  collegeMap.get("University of Texas at Austin"),
  null,
  "Spring Break Escape",
  "2027-03-15",
  "2027-03-20",
  "MIA",
  "Planning a shared beach trip with friends from different campuses.",
  1
);

insertParticipant.run(sharedTrip.lastInsertRowid, userIds[1]);
insertParticipant.run(sharedTrip.lastInsertRowid, userIds[2]);

const springBreakTemplate = db
  .prepare("SELECT id FROM breaks WHERE college_id = ? AND break_name = 'Spring Break'")
  .get(collegeMap.get("University of Texas at Austin"));

let sharedFlightPlanId = null;

if (springBreakTemplate?.id) {
  const suggestedFlight = insertFlight.run(
    springBreakTemplate.id,
    collegeMap.get("University of Texas at Austin"),
    "AUS",
    "JFK",
    "2027-03-15",
    "2027-03-20",
    "Delta",
    "DL410",
    259,
    "Economy Saver"
  );

  const sharedFlightPlan = insertFlightPlan.run(
    userIds[1],
    springBreakTemplate.id,
    suggestedFlight.lastInsertRowid,
    "Spring Break Homebound Flight",
    "AUS",
    "JFK",
    "Delta DL410",
    "2027-03-15",
    "2027-03-20",
    "Taking the same flight home for spring break."
  );

  sharedFlightPlanId = sharedFlightPlan.lastInsertRowid;

  insertFlightPlanParticipant.run(sharedFlightPlanId, userIds[1]);
  insertFlightPlanParticipant.run(sharedFlightPlanId, userIds[2]);

  insertRide.run(
    collegeMap.get("University of Texas at Austin"),
    userIds[1],
    sharedTrip.lastInsertRowid,
    suggestedFlight.lastInsertRowid,
    "AUS",
    "2027-03-15T06:30",
    4,
    "$20 per rider",
    "Gregory Gym bus loop",
    "Shared ride generated from a collaborative spring break plan."
  );
}

insertNotification.run(
  userIds[2],
  "friend_added",
  "New friend added",
  "Maya Thompson accepted your UniFly friend connection.",
  userIds[1]
);
insertNotification.run(
  userIds[1],
  "overlap_detected",
  "Spring break overlap found",
  "You have at least one verified overlapping break with a UniFly friend.",
  userIds[2]
);
insertNotification.run(
  userIds[2],
  "flight_invite",
  "Flight invitation",
  "Maya Thompson added you to Spring Break Homebound Flight.",
  sharedFlightPlanId
);

console.log(`Seed complete: ${allColleges.length} colleges, ${insertedBreakCount} verified breaks.`);
