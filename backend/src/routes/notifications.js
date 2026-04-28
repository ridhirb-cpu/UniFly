import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const notifications = db
    .prepare(
      `SELECT id, type, title, body, reference_id, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 25`
    )
    .all(req.user.id);

  res.json(notifications);
});

router.post("/:id/read", (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(
    req.params.id,
    req.user.id
  );
  res.json({ message: "Notification marked as read." });
});

export default router;
