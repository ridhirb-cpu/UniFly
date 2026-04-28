import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";
import { createNotification } from "../social.js";

const router = Router();

router.use(requireAuth);

function getTripByIdForUser(tripId, userId) {
  return db
    .prepare(
      `SELECT tp.*, c.name AS college_name
       FROM trip_plans tp
       JOIN trip_participants tpp ON tpp.trip_id = tp.id
       JOIN colleges c ON c.id = tp.college_id
       WHERE tp.id = ? AND tpp.user_id = ?`
    )
    .get(tripId, userId);
}

router.get("/", (req, res) => {
  const trips = db
    .prepare(
      `SELECT tp.id, tp.title, tp.start_date, tp.end_date, tp.destination, tp.notes,
              tp.is_shared, tp.creator_id, c.name AS college_name,
              (
                SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
                FROM trip_participants tp3
                JOIN users u ON u.id = tp3.user_id
                WHERE tp3.trip_id = tp.id
              ) AS participants
       FROM trip_plans tp
       JOIN trip_participants tpp ON tpp.trip_id = tp.id
       JOIN colleges c ON c.id = tp.college_id
       WHERE tpp.user_id = ?
       ORDER BY tp.start_date ASC`
    )
    .all(req.user.id);

  res.json(trips);
});

router.post("/", (req, res) => {
  const { collegeId, breakId, title, startDate, endDate, destination, notes, participantIds = [] } = req.body;
  if (!title || !startDate || !endDate || !destination) {
    return res.status(400).json({ message: "Trip title, dates, and destination are required." });
  }

  const trip = db
    .prepare(
      `INSERT INTO trip_plans
       (user_id, creator_id, college_id, break_id, title, start_date, end_date, destination, notes, is_shared)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      req.user.id,
      collegeId || req.user.college_id,
      breakId || null,
      title.trim(),
      startDate,
      endDate,
      destination.trim().toUpperCase(),
      notes?.trim() || null,
      participantIds.length ? 1 : 0
    );

  const uniqueParticipants = [...new Set([req.user.id, ...participantIds.map(Number)])];
  for (const participantId of uniqueParticipants) {
    db.prepare("INSERT INTO trip_participants (trip_id, user_id) VALUES (?, ?)").run(
      trip.lastInsertRowid,
      participantId
    );
    if (participantId !== req.user.id) {
      createNotification(
        participantId,
        "trip_invite",
        "Collaborative trip invite",
        `${req.user.first_name} ${req.user.last_name} added you to ${title.trim()}.`,
        trip.lastInsertRowid
      );
    }
  }

  const created = getTripByIdForUser(trip.lastInsertRowid, req.user.id);
  res.status(201).json(created);
});

router.put("/:id", (req, res) => {
  const trip = getTripByIdForUser(req.params.id, req.user.id);
  if (!trip) {
    return res.status(404).json({ message: "Trip not found." });
  }

  const { title, startDate, endDate, destination, notes } = req.body;
  db.prepare(
    `UPDATE trip_plans
     SET title = ?, start_date = ?, end_date = ?, destination = ?, notes = ?
     WHERE id = ?`
  ).run(
    title?.trim() || trip.title,
    startDate || trip.start_date,
    endDate || trip.end_date,
    destination?.trim().toUpperCase() || trip.destination,
    notes?.trim() || trip.notes,
    req.params.id
  );

  res.json(getTripByIdForUser(req.params.id, req.user.id));
});

router.post("/:id/create-ride", (req, res) => {
  const trip = getTripByIdForUser(req.params.id, req.user.id);
  if (!trip) {
    return res.status(404).json({ message: "Trip not found." });
  }

  const participants = db
    .prepare("SELECT user_id FROM trip_participants WHERE trip_id = ?")
    .all(req.params.id)
    .map((row) => row.user_id);

  const result = db
    .prepare(
      `INSERT INTO ride_posts
       (college_id, creator_id, trip_plan_id, departure_airport, departure_datetime, seats_available, cost_split, meeting_location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      trip.college_id,
      req.user.id,
      trip.id,
      req.body.departureAirport?.trim().toUpperCase() || trip.destination || "TBD",
      req.body.departureDateTime || `${trip.start_date}T08:00`,
      participants.length,
      req.body.costSplit?.trim() || "Shared group ride",
      req.body.meetingLocation?.trim() || "Main student union pickup zone",
      req.body.notes?.trim() || `Generated from collaborative trip plan: ${trip.title}`
    );

  for (const participantId of participants) {
    if (participantId !== req.user.id) {
      db.prepare("INSERT OR IGNORE INTO ride_memberships (ride_id, user_id, status) VALUES (?, ?, 'joined')").run(
        result.lastInsertRowid,
        participantId
      );
      createNotification(
        participantId,
        "group_ride_created",
        "Group ride created",
        `${req.user.first_name} ${req.user.last_name} created a ride for ${trip.title}.`,
        result.lastInsertRowid
      );
    }
  }

  const ride = db.prepare("SELECT * FROM ride_posts WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(ride);
});

export default router;
