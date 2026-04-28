import jwt from "jsonwebtoken";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "unifly-dev-secret";

export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      collegeId: user.college_id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare(
        `SELECT id, email, first_name, last_name, college_id, home_airport, role, is_verified, is_demo
         FROM users
         WHERE id = ?`
      )
      .get(payload.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid session." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  next();
}
