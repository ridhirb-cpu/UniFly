import { Router } from "express";
import { db } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware.js";

const router = Router();

router.get("/", (req, res) => {
  const { collegeId } = req.query;

  const deals = db
    .prepare(
      `SELECT id, title, description, link, expiration_date, applicable_colleges
       FROM deals
       WHERE expiration_date >= date('now')
         AND (
           ? IS NULL OR ? = ''
           OR applicable_colleges IS NULL
           OR applicable_colleges = ''
           OR applicable_colleges LIKE ?
         )
       ORDER BY expiration_date ASC`
    )
    .all(collegeId ?? null, collegeId ?? "", `%${collegeId}%`);

  res.json(deals);
});

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { title, description, link, expirationDate, applicableColleges } = req.body;

  if (!title || !description || !link || !expirationDate) {
    return res.status(400).json({ message: "Please provide all required deal details." });
  }

  const result = db
    .prepare(
      `INSERT INTO deals (title, description, link, expiration_date, applicable_colleges)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      description.trim(),
      link.trim(),
      expirationDate,
      applicableColleges?.join(",") || null
    );

  const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(deal);
});

export default router;
