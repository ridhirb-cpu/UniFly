#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const VALID_BREAK_TYPES = new Set([
  "fall_break",
  "thanksgiving_break",
  "winter_break",
  "spring_break"
]);

const FIX_MODE = process.argv.includes("--fix");
const defaultMigratedPath = path.resolve(__dirname, "../database/college_breaks.migrated.json");
const defaultLegacyPath = path.resolve(__dirname, "../database/college_breaks.json");
const fileFlagIndex = process.argv.findIndex((arg) => arg === "--file");
const targetPath =
  fileFlagIndex !== -1 && process.argv[fileFlagIndex + 1]
    ? path.resolve(process.cwd(), process.argv[fileFlagIndex + 1])
    : fs.existsSync(defaultMigratedPath)
      ? defaultMigratedPath
      : defaultLegacyPath;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Failed to read ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function formatSchoolName(entry, index) {
  if (entry && typeof entry.school === "string" && entry.school.trim()) {
    return entry.school.trim();
  }
  return `School at index ${index}`;
}

function addError(errors, schoolName, field, message) {
  errors.push(`[${schoolName}] → ${field}: ${message}`);
}

function normalizeBreakType(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : value;
}

function isValidAcademicYear(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = value.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return false;
  }

  const firstYear = Number(match[1]);
  const secondYear = Number(match[2]);
  return secondYear === firstYear + 1;
}

function getAcademicYearBounds(academicYear) {
  const match = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return null;
  }

  return {
    firstYear: Number(match[1]),
    secondYear: Number(match[2])
  };
}

function dateFallsWithinAcademicYear(dateValue, academicYear) {
  const bounds = getAcademicYearBounds(academicYear);
  if (!bounds || !isIsoDateString(dateValue)) {
    return false;
  }

  const date = parseIsoDate(dateValue);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  if (year === bounds.firstYear) {
    return month >= 8 && month <= 12;
  }

  if (year === bounds.secondYear) {
    return month >= 1 && month <= 6;
  }

  return false;
}

function rangesOverlap(left, right) {
  return left.start <= right.end && right.start <= left.end;
}

function dedupeBreaks(breaks) {
  const seen = new Set();
  const deduped = [];

  for (const item of breaks) {
    const breakType = normalizeBreakType(item && item.break_type);
    if (!breakType || seen.has(breakType)) {
      continue;
    }
    seen.add(breakType);
    deduped.push(item);
  }

  return deduped;
}

function validateBreaksDataset(data) {
  const errors = [];
  let validSchools = 0;
  let invalidSchools = 0;
  let mutated = false;

  if (!Array.isArray(data)) {
    console.error("college_breaks.json must contain an array of school objects.");
    process.exit(1);
  }

  data.forEach((entry, index) => {
    const schoolName = formatSchoolName(entry, index);
    let schoolHasErrors = false;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      addError(errors, schoolName, "entry", "must be an object");
      invalidSchools += 1;
      return;
    }

    if (FIX_MODE) {
      const trimmedSchool = normalizeString(entry.school);
      const trimmedYear = normalizeString(entry.academic_year);
      const trimmedStatus = normalizeString(entry.status);
      const trimmedVerifiedAt = normalizeString(entry.last_verified_at);

      if (trimmedSchool !== entry.school) {
        entry.school = trimmedSchool;
        mutated = true;
      }
      if (trimmedYear !== entry.academic_year) {
        entry.academic_year = trimmedYear;
        mutated = true;
      }
      if (trimmedStatus !== entry.status) {
        entry.status = trimmedStatus;
        mutated = true;
      }
      if (trimmedVerifiedAt !== entry.last_verified_at) {
        entry.last_verified_at = trimmedVerifiedAt;
        mutated = true;
      }

      if (Array.isArray(entry.breaks)) {
        entry.breaks.forEach((campusBreak) => {
          if (!campusBreak || typeof campusBreak !== "object") {
            return;
          }

          const normalizedType = normalizeBreakType(campusBreak.break_type);
          if (normalizedType !== campusBreak.break_type) {
            campusBreak.break_type = normalizedType;
            mutated = true;
          }

          ["display_name", "start_date", "end_date", "source"].forEach((field) => {
            const normalizedValue = normalizeString(campusBreak[field]);
            if (normalizedValue !== campusBreak[field]) {
              campusBreak[field] = normalizedValue;
              mutated = true;
            }
          });
        });

        const dedupedBreaks = dedupeBreaks(entry.breaks);
        if (dedupedBreaks.length !== entry.breaks.length) {
          entry.breaks = dedupedBreaks;
          mutated = true;
        }
      }
    }

    if (!isNonEmptyString(entry.school)) {
      addError(errors, schoolName, "school", "must be a non-empty string");
      schoolHasErrors = true;
    }

    if (!isValidAcademicYear(entry.academic_year)) {
      addError(errors, schoolName, "academic_year", "must match YYYY-YYYY and span consecutive years");
      schoolHasErrors = true;
    }

    if (!["verified", "unverified"].includes(entry.status)) {
      addError(errors, schoolName, "status", 'must be "verified" or "unverified"');
      schoolHasErrors = true;
    }

    const hasBreaksField = Object.prototype.hasOwnProperty.call(entry, "breaks");
    const breaks = hasBreaksField ? entry.breaks : undefined;

    if (entry.status === "verified") {
      if (!isIsoDateString(entry.last_verified_at)) {
        addError(errors, schoolName, "last_verified_at", "must be a valid ISO date (YYYY-MM-DD) when status is verified");
        schoolHasErrors = true;
      }

      if (!Array.isArray(breaks) || breaks.length === 0) {
        addError(errors, schoolName, "breaks", "is required and must be a non-empty array when status is verified");
        schoolHasErrors = true;
      }
    }

    if (entry.status === "unverified") {
      if (!(entry.last_verified_at === null || isIsoDateString(entry.last_verified_at))) {
        addError(errors, schoolName, "last_verified_at", "must be null or a valid ISO date when status is unverified");
        schoolHasErrors = true;
      }

      if (breaks !== undefined && (!Array.isArray(breaks) || breaks.length > 0)) {
        addError(errors, schoolName, "breaks", "must be empty or omitted when status is unverified");
        schoolHasErrors = true;
      }
    }

    if (Array.isArray(breaks) && isValidAcademicYear(entry.academic_year)) {
      const seenTypes = new Set();
      const normalizedRanges = [];

      breaks.forEach((campusBreak, breakIndex) => {
        const breakLabel =
          campusBreak && typeof campusBreak.break_type === "string" && campusBreak.break_type.trim()
            ? campusBreak.break_type
            : `breaks[${breakIndex}]`;

        if (!campusBreak || typeof campusBreak !== "object" || Array.isArray(campusBreak)) {
          addError(errors, schoolName, breakLabel, "must be an object");
          schoolHasErrors = true;
          return;
        }

        if (!VALID_BREAK_TYPES.has(campusBreak.break_type)) {
          addError(errors, schoolName, "break_type", `must be one of ${Array.from(VALID_BREAK_TYPES).join(", ")}`);
          schoolHasErrors = true;
        } else if (seenTypes.has(campusBreak.break_type)) {
          addError(errors, schoolName, campusBreak.break_type, "duplicate break_type is not allowed");
          schoolHasErrors = true;
        } else {
          seenTypes.add(campusBreak.break_type);
        }

        if (!isNonEmptyString(campusBreak.display_name)) {
          addError(errors, schoolName, `${breakLabel}.display_name`, "must be a non-empty string");
          schoolHasErrors = true;
        }

        if (!isIsoDateString(campusBreak.start_date)) {
          addError(errors, schoolName, `${breakLabel}.start_date`, "must be a valid ISO date (YYYY-MM-DD)");
          schoolHasErrors = true;
        }

        if (!isIsoDateString(campusBreak.end_date)) {
          addError(errors, schoolName, `${breakLabel}.end_date`, "must be a valid ISO date (YYYY-MM-DD)");
          schoolHasErrors = true;
        }

        if (!isNonEmptyString(campusBreak.source) || !/^https?:\/\//i.test(campusBreak.source)) {
          addError(errors, schoolName, `${breakLabel}.source`, "must be a valid http/https URL");
          schoolHasErrors = true;
        }

        if (isIsoDateString(campusBreak.start_date) && isIsoDateString(campusBreak.end_date)) {
          const start = parseIsoDate(campusBreak.start_date);
          const end = parseIsoDate(campusBreak.end_date);

          if (start > end) {
            addError(errors, schoolName, breakLabel, "end_date must be the same as or later than start_date");
            schoolHasErrors = true;
          }

          if (!dateFallsWithinAcademicYear(campusBreak.start_date, entry.academic_year)) {
            addError(errors, schoolName, `${breakLabel}.start_date`, "falls outside the declared academic_year window");
            schoolHasErrors = true;
          }

          if (!dateFallsWithinAcademicYear(campusBreak.end_date, entry.academic_year)) {
            addError(errors, schoolName, `${breakLabel}.end_date`, "falls outside the declared academic_year window");
            schoolHasErrors = true;
          }

          normalizedRanges.push({
            breakType: campusBreak.break_type,
            start,
            end
          });

          if (campusBreak.break_type === "thanksgiving_break") {
            const startMonth = start.getUTCMonth() + 1;
            const endMonth = end.getUTCMonth() + 1;
            const durationDays = Math.floor((end - start) / 86400000) + 1;

            if (startMonth !== 11 || endMonth !== 11) {
              addError(errors, schoolName, breakLabel, "thanksgiving_break must occur entirely in November");
              schoolHasErrors = true;
            }

            if (durationDays < 3 || durationDays > 10) {
              addError(errors, schoolName, breakLabel, "thanksgiving_break must be between 3 and 10 days long");
              schoolHasErrors = true;
            }
          }

          if (campusBreak.break_type === "winter_break") {
            const startMonth = start.getUTCMonth() + 1;
            const endMonth = end.getUTCMonth() + 1;
            const startYear = start.getUTCFullYear();
            const endYear = end.getUTCFullYear();

            if (!(startMonth === 12 && endMonth === 1 && endYear === startYear + 1)) {
              addError(errors, schoolName, breakLabel, "winter_break must span December into January");
              schoolHasErrors = true;
            }
          }
        }
      });

      for (let i = 0; i < normalizedRanges.length; i += 1) {
        for (let j = i + 1; j < normalizedRanges.length; j += 1) {
          if (rangesOverlap(normalizedRanges[i], normalizedRanges[j])) {
            addError(
              errors,
              schoolName,
              `${normalizedRanges[i].breakType}/${normalizedRanges[j].breakType}`,
              "break date ranges must not overlap"
            );
            schoolHasErrors = true;
          }
        }
      }
    }

    if (schoolHasErrors) {
      invalidSchools += 1;
    } else {
      validSchools += 1;
    }
  });

  return { errors, validSchools, invalidSchools, mutated, data };
}

const data = readJson(targetPath);
const result = validateBreaksDataset(data);

if (FIX_MODE && result.mutated) {
  fs.writeFileSync(targetPath, `${JSON.stringify(result.data, null, 2)}\n`);
}

if (result.errors.length) {
  result.errors.forEach((error) => console.error(error));
  console.error("");
  console.error(`✔ ${result.validSchools} schools valid`);
  console.error(`✖ ${result.invalidSchools} schools failed validation`);
  process.exit(1);
}

console.log(`✔ ${result.validSchools} schools valid`);
console.log(`✖ ${result.invalidSchools} schools failed validation`);
process.exit(0);
