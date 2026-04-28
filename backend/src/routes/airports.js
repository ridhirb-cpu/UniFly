import fs from "fs";
import path from "path";
import { Router } from "express";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const airportsPath = path.resolve(__dirname, "../../database/airports.json");

router.get("/", (req, res) => {
  const query = String(req.query.search || "").trim().toLowerCase();
  const airports = JSON.parse(fs.readFileSync(airportsPath, "utf8"));

  const results = airports
    .filter((airport) => {
      if (!query) return true;
      return [airport.code, airport.name, airport.city, airport.state].some((value) =>
        String(value).toLowerCase().includes(query)
      );
    })
    .slice(0, 8);

  res.json(results);
});

export default router;
