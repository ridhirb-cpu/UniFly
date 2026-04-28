import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const { search = "", state = "" } = req.query;

  const colleges = db
    .prepare(
      `SELECT id, name, city, state, airport_code, airport_name, airport_distance_miles
       FROM colleges
       WHERE name LIKE ? AND state LIKE ?
       ORDER BY name ASC`
    )
    .all(`%${search}%`, `%${state}%`);

  res.json(colleges.slice(0, 8));
});

router.get("/states", (_req, res) => {
  const states = db
    .prepare("SELECT DISTINCT state FROM colleges ORDER BY state ASC")
    .all()
    .map((row) => row.state);

  res.json(states);
});

router.get("/:id", (req, res) => {
  const college = db
    .prepare(
      `SELECT id, name, city, state, airport_code, airport_name, airport_distance_miles
       FROM colleges
       WHERE id = ?`
    )
    .get(req.params.id);

  if (!college) {
    return res.status(404).json({ message: "College not found." });
  }

  const nearestAirports = db
    .prepare(
      `SELECT airport_code AS code, airport_name AS name, airport_distance_miles AS distanceMiles
       FROM colleges
       WHERE state = ?
       GROUP BY airport_code, airport_name, airport_distance_miles
       ORDER BY airport_distance_miles ASC
       LIMIT 5`
    )
    .all(college.state);

  return res.json({ ...college, nearestAirports });
});

export default router;
