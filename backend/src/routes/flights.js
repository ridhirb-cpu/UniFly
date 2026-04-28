import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";
import { computeFriendOverlaps, createNotification } from "../social.js";

const router = Router();

router.use(requireAuth);

router.get("/suggestions", (req, res) => {
  const breakId = Number(req.query.breakId);
  const requestedHomeAirport = req.query.homeAirport?.trim().toUpperCase();

  const campusBreak = db
    .prepare(
      `SELECT b.id, b.break_name, b.start_date, b.end_date, b.college_id,
              c.name AS college_name, c.airport_code, c.airport_name
       FROM breaks b
       JOIN colleges c ON c.id = b.college_id
       WHERE b.id = ?`
    )
    .get(breakId);

  if (!campusBreak) {
    return res.status(404).json({ message: "Break not found." });
  }

  const homeAirport = requestedHomeAirport || req.user.home_airport;
  if (!homeAirport) {
    return res.status(400).json({ message: "Please save a home airport to search flights." });
  }

  let flights = db
    .prepare(
      `SELECT id, break_id, departure_airport, arrival_airport, depart_date, return_date,
              airline, flight_number, price, travel_class
       FROM flights
       WHERE break_id = ? AND departure_airport = ? AND arrival_airport = ?
       ORDER BY price ASC`
    )
    .all(breakId, campusBreak.airport_code, homeAirport);

  if (!flights.length) {
    const generated = buildBreakFlights(campusBreak, campusBreak.airport_code, homeAirport);
    const insert = db.prepare(
      `INSERT INTO flights
       (break_id, college_id, departure_airport, arrival_airport, depart_date, return_date, airline, flight_number, price, travel_class)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const flight of generated) {
      insert.run(
        campusBreak.id,
        campusBreak.college_id,
        flight.departure_airport,
        flight.arrival_airport,
        flight.depart_date,
        flight.return_date,
        flight.airline,
        flight.flight_number,
        flight.price,
        flight.travel_class
      );
    }

    flights = db
      .prepare(
        `SELECT id, break_id, departure_airport, arrival_airport, depart_date, return_date,
                airline, flight_number, price, travel_class
         FROM flights
         WHERE break_id = ? AND departure_airport = ? AND arrival_airport = ?
         ORDER BY price ASC`
      )
      .all(breakId, campusBreak.airport_code, homeAirport);
  }

  res.json({
    break: campusBreak,
    homeAirport,
    flights: flights.map((flight, index) => decorateFlight(flight, index, { useDatesOnly: true }))
  });
});

router.get("/search", (req, res) => {
  const departureAirport = req.query.departureAirport?.trim().toUpperCase();
  const destinationAirport = req.query.destinationAirport?.trim().toUpperCase();
  const startDate = req.query.startDate?.trim();
  const endDate = req.query.endDate?.trim();

  if (!departureAirport || !destinationAirport || !startDate || !endDate) {
    return res.status(400).json({ message: "Departure airport, destination airport, and travel dates are required." });
  }

  const flights = buildDirectSearchFlights({ departureAirport, destinationAirport, startDate, endDate });

  res.json({
    departureAirport,
    destinationAirport,
    startDate,
    endDate,
    flights: flights.map((flight, index) => decorateFlight(flight, index))
  });
});

router.get("/plans", (req, res) => {
  const plans = db
    .prepare(
      `SELECT fp.id, fp.title, fp.departure_airport, fp.destination, fp.selected_flight,
              fp.start_date, fp.end_date, fp.notes,
              (
                SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
                FROM flight_plan_participants fpp2
                JOIN users u ON u.id = fpp2.user_id
                WHERE fpp2.flight_plan_id = fp.id
              ) AS participants
       FROM flight_plans fp
       JOIN flight_plan_participants fpp ON fpp.flight_plan_id = fp.id
       WHERE fpp.user_id = ?
       ORDER BY fp.start_date ASC`
    )
    .all(req.user.id);

  res.json(plans);
});

router.post("/plans", (req, res) => {
  const {
    breakId,
    flightId,
    title,
    departureAirport,
    destination,
    selectedFlight,
    startDate,
    endDate,
    notes,
    participantIds = []
  } = req.body;

  if (!title || !departureAirport || !destination || !selectedFlight || !startDate || !endDate) {
    return res.status(400).json({ message: "Flight plan details are required." });
  }

  const requestedFlightId = Number(flightId);
  const persistedFlightId = Number.isInteger(requestedFlightId) && requestedFlightId > 0
    ? db.prepare("SELECT id FROM flights WHERE id = ?").get(requestedFlightId)?.id || null
    : null;

  const result = db
    .prepare(
      `INSERT INTO flight_plans
       (creator_id, break_id, flight_id, title, departure_airport, destination, selected_flight, start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      breakId || null,
      persistedFlightId,
      title.trim(),
      departureAirport.trim().toUpperCase(),
      destination.trim().toUpperCase(),
      selectedFlight.trim(),
      startDate,
      endDate,
      notes?.trim() || null
    );

  const uniqueParticipants = [...new Set([req.user.id, ...participantIds.map(Number)])];
  const insertParticipant = db.prepare(
    "INSERT INTO flight_plan_participants (flight_plan_id, user_id) VALUES (?, ?)"
  );
  for (const participantId of uniqueParticipants) {
    insertParticipant.run(result.lastInsertRowid, participantId);
    if (participantId !== req.user.id) {
      createNotification(
        participantId,
        "flight_invite",
        "Flight plan invite",
        `${req.user.first_name} ${req.user.last_name} invited you to join ${title.trim()}.`,
        result.lastInsertRowid
      );
    }
  }

  res.status(201).json(db.prepare("SELECT * FROM flight_plans WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/plans/:id", (req, res) => {
  const allowed = db
    .prepare(
      `SELECT fp.*
       FROM flight_plans fp
       JOIN flight_plan_participants fpp ON fpp.flight_plan_id = fp.id
       WHERE fp.id = ? AND fpp.user_id = ?`
    )
    .get(req.params.id, req.user.id);

  if (!allowed) {
    return res.status(404).json({ message: "Flight plan not found." });
  }

  const { title, departureAirport, destination, selectedFlight, startDate, endDate, notes } = req.body;
  db.prepare(
    `UPDATE flight_plans
     SET title = ?, departure_airport = ?, destination = ?, selected_flight = ?, start_date = ?, end_date = ?, notes = ?
     WHERE id = ?`
  ).run(
    title?.trim() || allowed.title,
    departureAirport?.trim().toUpperCase() || allowed.departure_airport,
    destination?.trim().toUpperCase() || allowed.destination,
    selectedFlight?.trim() || allowed.selected_flight,
    startDate || allowed.start_date,
    endDate || allowed.end_date,
    notes?.trim() || allowed.notes,
    req.params.id
  );

  res.json(db.prepare("SELECT * FROM flight_plans WHERE id = ?").get(req.params.id));
});

router.post("/plans/:id/add-ride", (req, res) => {
  const plan = db
    .prepare(
      `SELECT fp.*, fl.id AS flight_id, b.college_id
       FROM flight_plans fp
       LEFT JOIN flights fl ON fl.id = fp.flight_id
       LEFT JOIN breaks b ON b.id = fp.break_id
       JOIN flight_plan_participants fpp ON fpp.flight_plan_id = fp.id
       WHERE fp.id = ? AND fpp.user_id = ?`
    )
    .get(req.params.id, req.user.id);

  if (!plan) {
    return res.status(404).json({ message: "Flight plan not found." });
  }

  const participants = db
    .prepare("SELECT user_id FROM flight_plan_participants WHERE flight_plan_id = ?")
    .all(req.params.id)
    .map((row) => row.user_id);

  const ride = db
    .prepare(
      `INSERT INTO ride_posts
       (college_id, creator_id, flight_id, departure_airport, departure_datetime, seats_available, cost_split, meeting_location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      plan.college_id || req.user.college_id,
      req.user.id,
      plan.flight_id || null,
      plan.departure_airport,
      req.body.departureDateTime || `${plan.start_date}T08:00`,
      participants.length,
      req.body.costSplit?.trim() || "Airport ride split",
      req.body.meetingLocation?.trim() || "Main student union pickup zone",
      req.body.notes?.trim() || `Ride to airport for ${plan.title}`
    );

  for (const participantId of participants) {
    if (participantId !== req.user.id) {
      db.prepare("INSERT OR IGNORE INTO ride_memberships (ride_id, user_id, status) VALUES (?, ?, 'joined')").run(
        ride.lastInsertRowid,
        participantId
      );
    }
  }

  res.status(201).json(db.prepare("SELECT * FROM ride_posts WHERE id = ?").get(ride.lastInsertRowid));
});

router.get("/friends-overlaps", (req, res) => {
  res.json(computeFriendOverlaps(req.user.id));
});

function buildBreakFlights(campusBreak, departureAirport, arrivalAirport) {
  const airlines = [
    { airline: "Delta", basePrice: 248 },
    { airline: "United", basePrice: 271 },
    { airline: "American", basePrice: 289 }
  ];

  return airlines.map((carrier, index) => ({
    departure_airport: departureAirport,
    arrival_airport: arrivalAirport,
    depart_date: campusBreak.start_date,
    return_date: campusBreak.end_date,
    airline: carrier.airline,
    flight_number: `${carrier.airline.slice(0, 2).toUpperCase()}${(campusBreak.id % 50) + 180 + index * 6}`,
    price:
      carrier.basePrice +
      index * 33 +
      (new Date(campusBreak.start_date).getMonth() + 1) * 4 +
      (arrivalAirport.charCodeAt(0) % 19),
    travel_class: index === 0 ? "Basic Economy" : index === 1 ? "Main Cabin" : "Flexible"
  }));
}

function buildDirectSearchFlights({ departureAirport, destinationAirport, startDate, endDate }) {
  const airlines = [
    { airline: "Delta", offset: 0, minutes: 152, basePrice: 219, className: "Basic Economy" },
    { airline: "United", offset: 75, minutes: 168, basePrice: 244, className: "Main Cabin" },
    { airline: "American", offset: 150, minutes: 181, basePrice: 268, className: "Flexible" },
    { airline: "Southwest", offset: 220, minutes: 195, basePrice: 198, className: "Wanna Get Away" }
  ];

  return airlines.map((carrier, index) => {
    const departAt = buildDateTime(startDate, 6 + index * 2, carrier.offset % 60);
    const arriveAt = new Date(departAt.getTime() + carrier.minutes * 60000);

    return {
      id: `${departureAirport}-${destinationAirport}-${index}`,
      departure_airport: departureAirport,
      arrival_airport: destinationAirport,
      depart_date: startDate,
      return_date: endDate,
      depart_at: departAt.toISOString(),
      arrive_at: arriveAt.toISOString(),
      airline: carrier.airline,
      flight_number: `${carrier.airline.slice(0, 2).toUpperCase()}${321 + index * 17}`,
      price: carrier.basePrice + Math.abs(departureAirport.charCodeAt(0) - destinationAirport.charCodeAt(0)) * 3 + index * 19,
      travel_class: carrier.className
    };
  });
}

function decorateFlight(flight, index = 0, options = {}) {
  const useDatesOnly = options.useDatesOnly || false;
  const routeFingerprint =
    (flight.departure_airport?.charCodeAt(0) || 65) + (flight.arrival_airport?.charCodeAt(0) || 65) + index;
  const hasLayover = routeFingerprint % 3 === 0;
  const layoverAirports = ["ATL", "ORD", "DFW", "DEN", "CLT", "PHX"];
  const layoverAirport = hasLayover ? layoverAirports[routeFingerprint % layoverAirports.length] : null;
  const layoverDuration = hasLayover ? `${70 + (routeFingerprint % 3) * 25} min` : null;
  const stops = hasLayover ? 1 : 0;
  const durationMinutes = 135 + (routeFingerprint % 4) * 28 + stops * 52;
  const departAt = flight.depart_at || buildDateTime(flight.depart_date, 6 + index * 2, (routeFingerprint * 11) % 60).toISOString();
  const arriveAt =
    flight.arrive_at || new Date(new Date(departAt).getTime() + durationMinutes * 60000).toISOString();

  return {
    ...flight,
    depart_at: departAt,
    arrive_at: arriveAt,
    stops,
    layover_airport: layoverAirport,
    layover_duration: layoverDuration,
    duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
    bag_policy:
      flight.travel_class === "Flexible" ? "Carry-on and first checked bag included" : "Carry-on included, checked bag extra",
    seat_type:
      flight.travel_class === "Basic Economy" ? "Standard seat assigned at check-in" : "Standard seat selection available",
    purchase_url:
      flight.purchase_url ||
      `https://www.google.com/travel/flights?hl=en#flt=${flight.departure_airport}.${flight.arrival_airport}.${flight.depart_date}*${flight.arrival_airport}.${flight.departure_airport}.${flight.return_date}`,
    display_departure: useDatesOnly ? flight.depart_date : departAt,
    display_arrival: useDatesOnly ? flight.return_date : arriveAt
  };
}

function buildDateTime(dateString, hours, minutes) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default router;
