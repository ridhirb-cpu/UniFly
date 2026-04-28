const domainsByCollege = new Map([
  ["Indiana University Bloomington", ["indiana.edu"]],
  ["University of Michigan", ["umich.edu"]],
  ["University of North Carolina at Chapel Hill", ["unc.edu"]],
  ["University of Texas at Austin", ["utexas.edu"]],
  ["University of California, Los Angeles", ["ucla.edu"]],
  ["University of Southern California", ["usc.edu"]],
  ["University of Florida", ["ufl.edu"]],
  ["Florida State University", ["fsu.edu"]],
  ["University of Georgia", ["uga.edu"]],
  ["Georgia Institute of Technology", ["gatech.edu"]],
  ["Purdue University", ["purdue.edu"]],
  ["University of Illinois Urbana-Champaign", ["illinois.edu"]],
  ["University of Washington", ["uw.edu"]],
  ["University of Wisconsin-Madison", ["wisc.edu"]],
  ["Ohio State University", ["osu.edu"]],
  ["Pennsylvania State University", ["psu.edu"]],
  ["University of Virginia", ["virginia.edu"]],
  ["Duke University", ["duke.edu"]],
  ["North Carolina State University", ["ncsu.edu"]],
  ["University of Maryland, College Park", ["umd.edu"]]
]);

export function getAllowedDomainsForCollege(collegeName) {
  return domainsByCollege.get(collegeName) || [];
}

export function extractEmailDomain(email) {
  if (typeof email !== "string" || !email.includes("@")) {
    return "";
  }

  return email.trim().toLowerCase().split("@").pop() || "";
}
