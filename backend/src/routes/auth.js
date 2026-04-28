import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Router } from "express";
import { getAllowedDomainsForCollege, extractEmailDomain } from "../collegeEmailDomains.js";
import { db } from "../db.js";
import { createToken, requireAuth } from "../middleware.js";

const router = Router();

function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/auth/verify?token=${token}`;
  console.log(`[UniFly verification] ${email} -> ${verifyUrl}`);
}

async function handleRegister(req, res) {
  const firstName = req.body.firstName || req.body.first_name;
  const lastName = req.body.lastName || req.body.last_name;
  const email = req.body.email;
  const password = req.body.password;
  const collegeId = req.body.collegeId || req.body.college_id;
  const homeAirport = req.body.homeAirport || req.body.home_airport;

  if (!firstName || !lastName || !email || !password || !collegeId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!email.endsWith(".edu")) {
    return res.status(400).json({ message: "Please sign up with a valid .edu email." });
  }

  const college = db.prepare("SELECT id, name FROM colleges WHERE id = ?").get(collegeId);
  if (!college) {
    return res.status(400).json({ message: "Please select a valid college." });
  }

  const allowedDomains = getAllowedDomainsForCollege(college.name);
  const emailDomain = extractEmailDomain(email);
  if (allowedDomains.length && !allowedDomains.includes(emailDomain)) {
    return res.status(400).json({ message: "Please use your school email" });
  }

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: "An account already exists for this email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(24).toString("hex");
  const result = db
    .prepare(
      `INSERT INTO users (first_name, last_name, email, password_hash, college_id, home_airport, is_verified, is_demo, verification_token, role)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'student')`
    )
    .run(
      firstName.trim(),
      lastName.trim(),
      email.toLowerCase(),
      passwordHash,
      collegeId,
      homeAirport?.trim().toUpperCase() || null,
      verificationToken
    );

  sendVerificationEmail(email.toLowerCase(), verificationToken);

  return res.status(201).json({
    message: "Check your email to verify your account",
    userId: result.lastInsertRowid
  });
}

router.post("/signup", handleRegister);
router.post("/register", handleRegister);

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = db
    .prepare(
      `SELECT id, email, first_name, last_name, college_id, home_airport, role, password_hash, is_verified, is_demo
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

  if (!user.is_verified && !user.is_demo) {
    return res.status(403).json({ message: "Please verify your email before logging in." });
  }

  const { password_hash: _ignored, ...safeUser } = user;
  return res.json({
    token: createToken(safeUser),
    user: safeUser
  });
});

router.get("/verify", (req, res) => {
  const token = req.query.token?.trim();

  if (!token) {
    return res.status(400).json({ message: "Verification token is required." });
  }

  const user = db
    .prepare(
      `SELECT id, is_verified
       FROM users
       WHERE verification_token = ?`
    )
    .get(token);

  if (!user) {
    return res.status(404).json({ message: "Verification token is invalid or expired." });
  }

  db.prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?").run(user.id);
  res.json({ message: "Email verified successfully." });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.college_id, u.home_airport, u.is_verified,
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
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.college_id, u.home_airport, u.is_verified,
              c.name AS college_name
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.id = ?`
    )
    .get(req.user.id);

  res.json(user);
});

export default router;
