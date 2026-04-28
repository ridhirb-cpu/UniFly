#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const migratedPath = path.resolve(__dirname, "../database/college_breaks.migrated.json");
const verifiedPath = path.resolve(__dirname, "../database/college_breaks.verified.json");
const schoolName = process.argv.slice(2).join(" ").trim();
const VALID_BREAK_TYPES = new Set([
  "fall_break",
  "thanksgiving_break",
  "winter_break",
  "spring_break"
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to read ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isIsoDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateSchoolRecord(record) {
  const errors = [];

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    errors.push("school record must be an object");
    return errors;
  }

  if (!Array.isArray(record.breaks) || record.breaks.length === 0) {
    errors.push("breaks must be a non-empty array");
    return errors;
  }

  const seenTypes = new Set();

  for (const campusBreak of record.breaks) {
    if (!campusBreak || typeof campusBreak !== "object" || Array.isArray(campusBreak)) {
      errors.push("each break must be an object");
      continue;
    }

    if (!VALID_BREAK_TYPES.has(campusBreak.break_type)) {
      errors.push(`invalid break_type "${campusBreak.break_type}"`);
    } else if (seenTypes.has(campusBreak.break_type)) {
      errors.push(`duplicate break_type "${campusBreak.break_type}"`);
    } else {
      seenTypes.add(campusBreak.break_type);
    }

    if (!campusBreak.display_name || typeof campusBreak.display_name !== "string" || !campusBreak.display_name.trim()) {
      errors.push(`display_name is required for ${campusBreak.break_type || "unknown break"}`);
    }

    if (!isIsoDateString(campusBreak.start_date)) {
      errors.push(`invalid start_date for ${campusBreak.break_type || "unknown break"}`);
    }

    if (!isIsoDateString(campusBreak.end_date)) {
      errors.push(`invalid end_date for ${campusBreak.break_type || "unknown break"}`);
    }

    if (isIsoDateString(campusBreak.start_date) && isIsoDateString(campusBreak.end_date)) {
      if (new Date(`${campusBreak.start_date}T00:00:00Z`) > new Date(`${campusBreak.end_date}T00:00:00Z`)) {
        errors.push(`end_date is before start_date for ${campusBreak.break_type}`);
      }
    }

    if (typeof campusBreak.source !== "string" || !/^https?:\/\//i.test(campusBreak.source.trim())) {
      errors.push(`source is required for ${campusBreak.break_type || "unknown break"}`);
    }
  }

  return errors;
}

if (!schoolName) {
  fail('Usage: node scripts/promoteBreaks.js "School Name"');
}

const migratedData = readJson(migratedPath, []);
const verifiedData = readJson(verifiedPath, []);

if (!Array.isArray(migratedData)) {
  fail("database/college_breaks.migrated.json must contain an array.");
}

if (!Array.isArray(verifiedData)) {
  fail("database/college_breaks.verified.json must contain an array.");
}

const migratedIndex = migratedData.findIndex((entry) => entry && entry.school === schoolName);
if (migratedIndex === -1) {
  fail(`School not found in migrated dataset: ${schoolName}`);
}

if (verifiedData.some((entry) => entry && entry.school === schoolName)) {
  fail(`School already exists in verified dataset: ${schoolName}`);
}

const schoolRecord = migratedData[migratedIndex];
const validationErrors = validateSchoolRecord(schoolRecord);

if (validationErrors.length) {
  console.error(`Could not promote ${schoolName}:`);
  validationErrors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const promotedRecord = {
  ...schoolRecord,
  status: "verified",
  last_verified_at: today
};

verifiedData.push(promotedRecord);
verifiedData.sort((left, right) => left.school.localeCompare(right.school));

migratedData.splice(migratedIndex, 1);

writeJson(verifiedPath, verifiedData);
writeJson(migratedPath, migratedData);

console.log(`Promoted ${schoolName} to database/college_breaks.verified.json`);
