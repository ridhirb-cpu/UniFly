#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const sourcePath = path.resolve(__dirname, "../database/college_breaks.json");
const destinationPath = path.resolve(__dirname, "../database/college_breaks.migrated.json");

const BREAK_TYPE_MAP = {
  "spring break": "spring_break",
  "winter break": "winter_break",
  "thanksgiving break": "thanksgiving_break",
  "fall break": "fall_break"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function normalizeBreakType(name) {
  if (typeof name !== "string") {
    return null;
  }

  const normalized = name.trim().toLowerCase();
  if (BREAK_TYPE_MAP[normalized]) {
    return BREAK_TYPE_MAP[normalized];
  }

  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function inferAcademicYear(breaks) {
  const candidates = [];

  for (const campusBreak of breaks) {
    if (!isIsoDate(campusBreak.start_date) || !isIsoDate(campusBreak.end_date)) {
      continue;
    }

    const start = parseDate(campusBreak.start_date);
    const end = parseDate(campusBreak.end_date);
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();
    const startMonth = start.getUTCMonth() + 1;
    const endMonth = end.getUTCMonth() + 1;

    if (startMonth === 12 && endMonth === 1 && endYear === startYear + 1) {
      candidates.push(`${startYear}-${endYear}`);
      continue;
    }

    if (startMonth >= 8) {
      candidates.push(`${startYear}-${startYear + 1}`);
      continue;
    }

    if (startMonth <= 6) {
      candidates.push(`${startYear - 1}-${startYear}`);
    }
  }

  if (!candidates.length) {
    return null;
  }

  const frequency = new Map();
  for (const candidate of candidates) {
    frequency.set(candidate, (frequency.get(candidate) || 0) + 1);
  }

  return [...frequency.entries()].sort((left, right) => right[1] - left[1])[0][0];
}

function migrate() {
  const source = readJson(sourcePath);

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Expected old college_breaks.json to be an object-map keyed by school name.");
  }

  const migrated = Object.entries(source)
    .map(([school, breaks]) => {
      const safeBreaks = Array.isArray(breaks) ? breaks : [];
      return {
        school,
        academic_year: inferAcademicYear(safeBreaks),
        status: "unverified",
        last_verified_at: null,
        breaks: safeBreaks.map((campusBreak) => ({
          break_type: normalizeBreakType(campusBreak.break_name),
          display_name: campusBreak.break_name ?? "",
          start_date: campusBreak.start_date ?? null,
          end_date: campusBreak.end_date ?? null,
          source: null
        }))
      };
    })
    .sort((left, right) => left.school.localeCompare(right.school));

  fs.writeFileSync(destinationPath, `${JSON.stringify(migrated, null, 2)}\n`);
  console.log(`Migrated ${migrated.length} schools to ${destinationPath}`);
}

try {
  migrate();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
