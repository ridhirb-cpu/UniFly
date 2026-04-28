import { useState } from "react";
import { CollegeSearchSelect } from "../components/CollegeSearchSelect";
import { api } from "../lib/api";

export function OnboardingPage() {
  const [collegeId, setCollegeId] = useState("");
  const [college, setCollege] = useState(null);

  async function handleCollegeChange(nextCollegeId) {
    setCollegeId(nextCollegeId);
    if (!nextCollegeId) {
      setCollege(null);
      return;
    }
    const selectedCollege = await api.get(`/colleges/${nextCollegeId}`);
    setCollege(selectedCollege);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="glass rounded-[32px] border border-white/70 p-6 shadow-panel sm:p-8">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">College onboarding</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Find your campus and nearest airport</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Use the searchable college directory to narrow by state and instantly preview the airport you’ll most likely use.
        </p>
        <div className="mt-6">
          <CollegeSearchSelect value={collegeId} onChange={handleCollegeChange} />
        </div>
      </section>

      {college ? (
        <section className="rounded-[32px] bg-ink p-6 text-white shadow-panel sm:p-8">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sand">Campus preview</div>
          <h2 className="mt-2 text-3xl font-semibold">{college.name}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {college.city}, {college.state}
          </p>
          <div className="mt-6 rounded-[28px] bg-white/10 p-5">
            <div className="text-sm font-medium text-slate-300">Closest airport</div>
            <div className="mt-2 text-2xl font-semibold">
              {college.airport_name} ({college.airport_code})
            </div>
            <div className="mt-1 text-sm text-slate-300">{college.airport_distance_miles} miles from campus</div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
