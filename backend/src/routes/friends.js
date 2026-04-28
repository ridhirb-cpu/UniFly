import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware.js";
import { computeFriendOverlaps, createNotification, getAcceptedFriends } from "../social.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const friends = getAcceptedFriends(req.user.id);

  const incoming = db
    .prepare(
      `SELECT f.id, f.status, f.requester_id, u.first_name, u.last_name, u.email,
              c.name AS college_name
       FROM friends f
       JOIN users u ON u.id = f.requester_id
       JOIN colleges c ON c.id = u.college_id
       WHERE f.receiver_id = ? AND f.status = 'pending' AND u.is_demo = 0
       ORDER BY f.created_at DESC`
    )
    .all(req.user.id);

  const outgoing = db
    .prepare(
      `SELECT f.id, f.status, f.receiver_id, u.first_name, u.last_name, u.email,
              c.name AS college_name
       FROM friends f
       JOIN users u ON u.id = f.receiver_id
       JOIN colleges c ON c.id = u.college_id
       WHERE f.requester_id = ? AND f.status = 'pending' AND u.is_demo = 0
       ORDER BY f.created_at DESC`
    )
    .all(req.user.id);

  res.json({ friends, incoming, outgoing });
});

router.get("/search", (req, res) => {
  const query = (req.query.query || "").trim();
  if (!query) {
    return res.json([]);
  }

  const users = db
    .prepare(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.home_airport, c.name AS college_name
       FROM users u
       JOIN colleges c ON c.id = u.college_id
       WHERE u.id != ?
         AND u.is_demo = 0
         AND (
           u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR c.name LIKE ?
         )
       ORDER BY u.first_name, u.last_name
       LIMIT 12`
    )
    .all(req.user.id, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);

  res.json(users);
});

router.post("/requests", (req, res) => {
  const { receiverId } = req.body;
  if (!receiverId) {
    return res.status(400).json({ message: "receiverId is required." });
  }

  if (Number(receiverId) === req.user.id) {
    return res.status(400).json({ message: "You cannot add yourself as a friend." });
  }

  const existing = db
    .prepare(
      `SELECT * FROM friends
       WHERE (requester_id = ? AND receiver_id = ?)
          OR (requester_id = ? AND receiver_id = ?)`
    )
    .get(req.user.id, receiverId, receiverId, req.user.id);

  if (existing) {
    return res.status(409).json({ message: "A friend request or friendship already exists." });
  }

  const result = db
    .prepare(
      `INSERT INTO friends (requester_id, receiver_id, status, updated_at)
       VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)`
    )
    .run(req.user.id, receiverId);

  createNotification(
    receiverId,
    "friend_request",
    "New friend request",
    `${req.user.first_name} ${req.user.last_name} sent you a UniFly friend request.`,
    result.lastInsertRowid
  );

  res.status(201).json({ message: "Friend request sent." });
});

router.post("/requests/:id/respond", (req, res) => {
  const { action } = req.body;
  const request = db
    .prepare("SELECT * FROM friends WHERE id = ? AND receiver_id = ?")
    .get(req.params.id, req.user.id);

  if (!request) {
    return res.status(404).json({ message: "Friend request not found." });
  }

  if (!["accepted", "declined"].includes(action)) {
    return res.status(400).json({ message: "Action must be accepted or declined." });
  }

  db.prepare("UPDATE friends SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    action,
    req.params.id
  );

  if (action === "accepted") {
    createNotification(
      request.requester_id,
      "friend_added",
      "Friend request accepted",
      `${req.user.first_name} ${req.user.last_name} accepted your friend request.`,
      req.user.id
    );

    const overlaps = computeFriendOverlaps(req.user.id).filter((item) => item.friendId === request.requester_id);
    for (const overlap of overlaps) {
      createNotification(request.requester_id, "overlap_detected", "Break overlap found", overlap.message, req.user.id);
      createNotification(req.user.id, "overlap_detected", "Break overlap found", overlap.message, request.requester_id);
    }
  }

  res.json({ message: `Friend request ${action}.` });
});

router.get("/breaks", (req, res) => {
  const friends = getAcceptedFriends(req.user.id).map((friend) => {
    const breaks = db
      .prepare(
        `SELECT id, break_name, start_date, end_date
         FROM breaks
         WHERE college_id = ?
         ORDER BY start_date ASC`
      )
      .all(friend.college_id);

    return {
      ...friend,
      breaks
    };
  });

  const overlaps = computeFriendOverlaps(req.user.id);
  res.json({ friends, overlaps });
});

export default router;
