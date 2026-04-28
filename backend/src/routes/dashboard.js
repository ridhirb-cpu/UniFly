import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const collegeId = req.user.college_id;

  const upcomingBreaks = db
    .prepare(
      `SELECT break_name, start_date, end_date
       FROM breaks
       WHERE college_id = ? AND end_date >= date('now')
       ORDER BY start_date ASC
       LIMIT 4`
    )
    .all(collegeId);

  const suggestedFlights = req.user.home_airport
    ? db
        .prepare(
          `SELECT f.id, f.departure_airport, f.arrival_airport, f.depart_date, f.return_date,
                  f.airline, f.flight_number, f.price, b.break_name
           FROM flights f
           JOIN breaks b ON b.id = f.break_id
           WHERE f.college_id = ? AND f.arrival_airport = ? AND b.end_date >= date('now')
           ORDER BY b.start_date ASC, f.price ASC
           LIMIT 6`
        )
        .all(collegeId, req.user.home_airport)
    : [];

  const friendTravelers = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM friends
       WHERE (requester_id = ? OR receiver_id = ?)
         AND status = 'accepted'`
    )
    .get(req.user.id, req.user.id).count;

  const airportRides = db
    .prepare(
      `SELECT r.id, r.departure_airport, r.departure_datetime, r.meeting_location, r.flight_id
       FROM ride_posts r
       JOIN users u ON u.id = r.creator_id
       WHERE college_id = ? AND departure_datetime >= datetime('now')
         AND u.is_demo = 0
       ORDER BY departure_datetime ASC
       LIMIT 6`
    )
    .all(collegeId);

  const deals = db
    .prepare(
      `SELECT id, title, expiration_date
       FROM deals
       WHERE expiration_date >= date('now')
       ORDER BY expiration_date ASC
       LIMIT 5`
    )
    .all();

  const notifications = db
    .prepare(
      `SELECT id, type, title, body, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 6`
    )
    .all(req.user.id);

  res.json({ upcomingBreaks, suggestedFlights, friendTravelers, airportRides, deals, notifications });
});

export default router;
