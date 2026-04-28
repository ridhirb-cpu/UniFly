import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";

const router = Router();

router.get("/", (req, res) => {
  const { collegeId } = req.query;

  if (!collegeId) {
    return res.status(400).json({ message: "collegeId is required." });
  }

  const college = db.prepare("SELECT id, name FROM colleges WHERE id = ?").get(collegeId);
  if (!college) {
    return res.status(404).json({ message: "College not found." });
  }

  const breaks = db
    .prepare(
      `SELECT id, college_id, break_name, start_date, end_date, source_url AS source
       FROM breaks
       WHERE college_id = ?
       ORDER BY start_date ASC`
    )
    .all(collegeId);

  res.json(breaks);
});

router.put("/:id", requireAuth, (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start and end dates are required." });
  }

  if (endDate < startDate) {
    return res.status(400).json({ message: "End date must be the same as or later than the start date." });
  }

  const existingBreak = db.prepare("SELECT id FROM breaks WHERE id = ?").get(req.params.id);
  if (!existingBreak) {
    return res.status(404).json({ message: "Break not found." });
  }

  db.prepare("UPDATE breaks SET start_date = ?, end_date = ? WHERE id = ?").run(startDate, endDate, req.params.id);
  res.json(
    db
      .prepare("SELECT id, college_id, break_name, start_date, end_date, source_url AS source FROM breaks WHERE id = ?")
      .get(req.params.id)
  );
});

router.post("/trip-plans", requireAuth, (req, res) => {
  const { collegeId, breakId, title, startDate, endDate, destination, notes } = req.body;

  if (!collegeId || !title || !startDate || !endDate) {
    return res.status(400).json({ message: "Trip plan title and dates are required." });
  }

  const result = db
    .prepare(
      `INSERT INTO trip_plans
       (user_id, creator_id, college_id, break_id, title, start_date, end_date, destination, notes, is_shared)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      req.user.id,
      req.user.id,
      collegeId,
      breakId || null,
      title.trim(),
      startDate,
      endDate,
      destination?.trim().toUpperCase() || null,
      notes?.trim() || null
    );

  db.prepare("INSERT INTO trip_participants (trip_id, user_id) VALUES (?, ?)").run(result.lastInsertRowid, req.user.id);

  const plan = db.prepare("SELECT * FROM trip_plans WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(plan);
});

router.get("/trip-plans/mine", requireAuth, (req, res) => {
  const plans = db
    .prepare(
      `SELECT tp.id, tp.title, tp.start_date, tp.end_date, tp.notes, tp.created_at,
              tp.destination, tp.is_shared, b.break_name, c.name AS college_name,
              (
                SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
                FROM trip_participants tp3
                JOIN users u ON u.id = tp3.user_id
                WHERE tp3.trip_id = tp.id
              ) AS participants
       FROM trip_plans tp
       JOIN trip_participants tpp ON tpp.trip_id = tp.id
       LEFT JOIN breaks b ON b.id = tp.break_id
       JOIN colleges c ON c.id = tp.college_id
       WHERE tpp.user_id = ?
       ORDER BY tp.start_date ASC`
    )
    .all(req.user.id);

  res.json(plans);
});

export default router;
