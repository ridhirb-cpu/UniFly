import bcrypt from "bcryptjs";
import { Router } from "express";
import { db } from "../db.js";
import { createToken, requireAuth } from "../middleware.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password, collegeId, homeAirport } = req.body;

  if (!firstName || !lastName || !email || !password || !collegeId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!email.endsWith(".edu")) {
    return res.status(400).json({ message: "Please sign up with a valid .edu email." });
  }

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: "An account already exists for this email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare(
      `INSERT INTO users (first_name, last_name, email, password_hash, college_id, home_airport, is_verified, role)
       VALUES (?, ?, ?, ?, ?, ?, 1, 'student')`
    )
    .run(
      firstName.trim(),
      lastName.trim(),
      email.toLowerCase(),
      passwordHash,
      collegeId,
      homeAirport?.trim().toUpperCase() || null
    );

  const user = db
    .prepare(
      `SELECT id, email, first_name, last_name, college_id, home_airport, role
       FROM users
       WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return res.status(201).json({
    token: createToken(user),
    user
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = db
    .prepare(
      `SELECT id, email, first_name, last_name, college_id, home_airport, role, password_hash
       FROM users
       WHERE email = ?`
    )
    .get(email.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const { password_hash: _ignored, ...safeUser } = user;
  return res.json({
    token: createToken(safeUser),
    user: safeUser
  });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.college_id, u.home_airport,
              c.name AS college_name
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.id = ?`
    )
    .get(req.user.id);

  res.json(user);
});

router.put("/home-airport", requireAuth, (req, res) => {
  const { homeAirport } = req.body;
  if (!homeAirport?.trim()) {
    return res.status(400).json({ message: "Home airport is required." });
  }

  db.prepare("UPDATE users SET home_airport = ? WHERE id = ?").run(homeAirport.trim().toUpperCase(), req.user.id);

  const user = db
    .prepare(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.college_id, u.home_airport,
              c.name AS college_name
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.id = ?`
    )
    .get(req.user.id);

  res.json(user);
});

export default router;
