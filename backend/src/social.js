import { db } from "./db.js";

export function getAcceptedFriends(userId) {
  return db
    .prepare(
      `SELECT
          CASE
            WHEN f.requester_id = ? THEN f.receiver_id
            ELSE f.requester_id
          END AS friend_id,
          u.first_name,
          u.last_name,
          u.email,
          u.home_airport,
          u.college_id,
          c.name AS college_name
       FROM friends f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.receiver_id ELSE f.requester_id END
       JOIN colleges c ON c.id = u.college_id
       WHERE (f.requester_id = ? OR f.receiver_id = ?)
         AND f.status = 'accepted'
         AND u.is_demo = 0
       ORDER BY u.first_name, u.last_name`
    )
    .all(userId, userId, userId, userId);
}

export function createNotification(userId, type, title, body, referenceId = null) {
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, reference_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, type, title, body, referenceId);
}

export function computeFriendOverlaps(userId) {
  const friends = getAcceptedFriends(userId);

  return friends.flatMap((friend) => {
    const overlaps = db
      .prepare(
        `SELECT
            mine.id AS breakId,
            mine.break_name AS my_break_name,
            mine.start_date AS my_start_date,
            mine.end_date AS my_end_date,
            theirs.break_name AS friend_break_name,
            theirs.start_date AS friend_start_date,
            theirs.end_date AS friend_end_date,
            MAX(mine.start_date, theirs.start_date) AS overlap_start,
            MIN(mine.end_date, theirs.end_date) AS overlap_end
         FROM breaks mine
         JOIN breaks theirs
           ON mine.break_name = theirs.break_name
         WHERE mine.college_id = (
             SELECT college_id FROM users WHERE id = ?
           )
           AND theirs.college_id = ?
           AND date(mine.start_date) <= date(theirs.end_date)
           AND date(theirs.start_date) <= date(mine.end_date)
         ORDER BY overlap_start ASC`
      )
      .all(userId, friend.college_id);

    return overlaps.map((overlap) => ({
      ...overlap,
      friendId: friend.friend_id,
      friendName: `${friend.first_name} ${friend.last_name}`,
      friendCollege: friend.college_name,
      message: `You and ${friend.first_name} ${friend.last_name} are both on ${overlap.my_break_name} ${formatDateRange(
        overlap.overlap_start,
        overlap.overlap_end
      )}`
    }));
  });
}

function formatDateRange(start, end) {
  const startDate = new Date(start).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const endDate = new Date(end).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return `${startDate}-${endDate}`;
}
