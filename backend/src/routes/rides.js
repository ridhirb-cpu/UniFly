import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";

const router = Router();

router.get("/", (req, res) => {
  const { collegeId = "", date = "", airport = "" } = req.query;

  const rides = db
    .prepare(
      `SELECT r.id, r.departure_airport, r.departure_datetime, r.seats_available,
              r.cost_split, r.meeting_location, r.notes, r.creator_id,
              c.name AS college_name, c.id AS college_id,
              u.first_name, u.last_name,
              (
                SELECT COUNT(*)
                FROM ride_memberships rm
                WHERE rm.ride_id = r.id
              ) AS passenger_count
       FROM ride_posts r
       JOIN colleges c ON c.id = r.college_id
       JOIN users u ON u.id = r.creator_id
       WHERE CAST(r.college_id AS TEXT) LIKE ?
         AND u.is_demo = 0
         AND r.departure_airport LIKE ?
         AND r.departure_datetime LIKE ?
       ORDER BY r.departure_datetime ASC`
    )
    .all(`%${collegeId}%`, `%${airport}%`, `%${date}%`);

  res.json(rides);
});

router.post("/", requireAuth, (req, res) => {
  const {
    collegeId,
    tripPlanId,
    flightId,
    departureAirport,
    departureDateTime,
    seatsAvailable,
    costSplit,
    meetingLocation,
    notes
  } = req.body;

  if (!collegeId || !departureAirport || !departureDateTime || !seatsAvailable || !meetingLocation) {
    return res.status(400).json({ message: "Please complete all required ride details." });
  }

  const result = db
    .prepare(
      `INSERT INTO ride_posts
       (college_id, creator_id, trip_plan_id, flight_id, departure_airport, departure_datetime, seats_available, cost_split, meeting_location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      collegeId,
      req.user.id,
      tripPlanId || null,
      flightId || null,
      departureAirport.trim(),
      departureDateTime,
      Number(seatsAvailable),
      costSplit?.trim() || null,
      meetingLocation.trim(),
      notes?.trim() || null
    );

  const ride = db
    .prepare(
      `SELECT r.*, c.name AS college_name
       FROM ride_posts r
       JOIN colleges c ON c.id = r.college_id
       WHERE r.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(ride);
});

router.post("/:id/join", requireAuth, (req, res) => {
  const ride = db.prepare("SELECT * FROM ride_posts WHERE id = ?").get(req.params.id);

  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  if (ride.creator_id === req.user.id) {
    return res.status(400).json({ message: "You already created this ride." });
  }

  const existingMembership = db
    .prepare("SELECT id FROM ride_memberships WHERE ride_id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (existingMembership) {
    return res.status(409).json({ message: "You already joined this ride." });
  }

  const currentPassengers = db
    .prepare("SELECT COUNT(*) AS count FROM ride_memberships WHERE ride_id = ?")
    .get(req.params.id).count;

  if (currentPassengers >= ride.seats_available) {
    return res.status(400).json({ message: "This ride is already full." });
  }

  db.prepare("INSERT INTO ride_memberships (ride_id, user_id, status) VALUES (?, ?, 'joined')").run(
    req.params.id,
    req.user.id
  );

  db.prepare(
    `INSERT INTO messages (ride_id, sender_id, recipient_id, content)
     VALUES (?, ?, ?, ?)`
  ).run(
    req.params.id,
    req.user.id,
    ride.creator_id,
    `${req.user.first_name} joined your ride to ${ride.departure_airport}.`
  );

  res.status(201).json({ message: "Ride joined successfully." });
});

router.post("/:id/leave", requireAuth, (req, res) => {
  const membership = db
    .prepare("SELECT id FROM ride_memberships WHERE ride_id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (!membership) {
    return res.status(404).json({ message: "You have not joined this ride." });
  }

  db.prepare("DELETE FROM ride_memberships WHERE ride_id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ message: "You left the ride." });
});

router.post("/:id/cancel", requireAuth, (req, res) => {
  const ride = db.prepare("SELECT id, creator_id FROM ride_posts WHERE id = ?").get(req.params.id);

  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  if (ride.creator_id !== req.user.id) {
    return res.status(403).json({ message: "Only the ride creator can cancel this ride." });
  }

  db.prepare("DELETE FROM ride_posts WHERE id = ?").run(req.params.id);
  res.json({ message: "Ride canceled." });
});

router.get("/mine/list", requireAuth, (req, res) => {
  const created = db
    .prepare(
      `SELECT r.id, r.departure_airport, r.departure_datetime, r.meeting_location, r.seats_available,
              r.cost_split, r.notes, c.name AS college_name, c.id AS college_id,
              r.creator_id, r.trip_plan_id, r.flight_id,
              u.first_name, u.last_name,
              (
                SELECT COUNT(*)
                FROM ride_memberships rm
                WHERE rm.ride_id = r.id
              ) AS passenger_count
       FROM ride_posts r
       JOIN colleges c ON c.id = r.college_id
       JOIN users u ON u.id = r.creator_id
       WHERE r.creator_id = ?
       ORDER BY r.departure_datetime ASC`
    )
    .all(req.user.id);

  const joined = db
    .prepare(
      `SELECT r.id, r.departure_airport, r.departure_datetime, r.meeting_location, r.seats_available,
              r.cost_split, r.notes, c.name AS college_name, c.id AS college_id,
              r.creator_id, r.trip_plan_id, r.flight_id,
              u.first_name, u.last_name,
              (
                SELECT COUNT(*)
                FROM ride_memberships rm2
                WHERE rm2.ride_id = r.id
              ) AS passenger_count
       FROM ride_memberships rm
       JOIN ride_posts r ON r.id = rm.ride_id
       JOIN colleges c ON c.id = r.college_id
       JOIN users u ON u.id = r.creator_id
       WHERE rm.user_id = ?
       ORDER BY r.departure_datetime ASC`
    )
    .all(req.user.id);

  res.json({ created, joined });
});

router.get("/:id/messages", requireAuth, (req, res) => {
  const messages = db
    .prepare(
      `SELECT m.id, m.content, m.created_at, m.sender_id, m.recipient_id,
              s.first_name AS sender_first_name, s.last_name AS sender_last_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       WHERE m.ride_id = ? AND (m.sender_id = ? OR m.recipient_id = ?)
       ORDER BY m.created_at ASC`
    )
    .all(req.params.id, req.user.id, req.user.id);

  res.json(messages);
});

router.post("/:id/messages", requireAuth, (req, res) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content?.trim()) {
    return res.status(400).json({ message: "Recipient and message are required." });
  }

  const ride = db.prepare("SELECT id FROM ride_posts WHERE id = ?").get(req.params.id);
  if (!ride) {
    return res.status(404).json({ message: "Ride not found." });
  }

  const result = db
    .prepare(
      `INSERT INTO messages (ride_id, sender_id, recipient_id, content)
       VALUES (?, ?, ?, ?)`
    )
    .run(req.params.id, req.user.id, recipientId, content.trim());

  const message = db
    .prepare(
      `SELECT m.id, m.content, m.created_at, m.sender_id, m.recipient_id,
              u.first_name AS sender_first_name, u.last_name AS sender_last_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(message);
});

export default router;
