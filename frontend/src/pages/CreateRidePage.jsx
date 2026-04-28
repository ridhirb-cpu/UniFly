import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CollegeSearchSelect } from "../components/CollegeSearchSelect";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const initialRide = {
  collegeId: "",
  departureAirport: "",
  departureDateTime: "",
  seatsAvailable: 3,
  costSplit: "",
  meetingLocation: "",
  notes: ""
};

export function CreateRidePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const [form, setForm] = useState(initialRide);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (user?.college_id) {
      setForm((current) => ({ ...current, collegeId: String(user.college_id) }));
      api.get(`/colleges/${user.college_id}`).then(setSelectedCollege).catch(() => setSelectedCollege(null));
    }
  }, [user]);

  useEffect(() => {
    const prefillRide = location.state?.prefillRide;
    if (!prefillRide) return;

    setForm((current) => ({
      ...current,
      departureAirport: prefillRide.departureAirport || current.departureAirport,
      departureDateTime: prefillRide.departureDate ? `${prefillRide.departureDate}T08:00` : current.departureDateTime,
      notes: prefillRide.flightNumber
        ? `Airport ride linked to ${prefillRide.flightNumber} from ${prefillRide.departureAirport} to ${prefillRide.arrivalAirport}.`
        : current.notes
    }));
    setStatus(`Prefilled from ${prefillRide.flightNumber}. Finish the airport ride details below.`);
  }, [location.state]);

  async function handleCollegeChange(collegeId) {
    setForm((current) => ({ ...current, collegeId }));
    if (!collegeId) {
      setSelectedCollege(null);
      return;
    }
    const college = await api.get(`/colleges/${collegeId}`);
    setSelectedCollege(college);
    setForm((current) => ({ ...current, departureAirport: college.airport_code }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!token) {
      setStatus("Please log in before creating a ride.");
      return;
    }

    try {
      await api.post("/rides", form, token);
      navigate("/rides");
    } catch (error) {
      setStatus(error.message);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const mapSrc = form.meetingLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(form.meetingLocation)}&output=embed`
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="glass rounded-[32px] border border-white/70 p-6 shadow-panel sm:p-8">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Create Ride</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create an airport ride add-on</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Airport rides can be a campus carpool, a shared Uber or Lyft, or any coordinated group ride to the airport after the flight is chosen.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <CollegeSearchSelect value={form.collegeId} onChange={handleCollegeChange} />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.departureAirport}
              onChange={(event) => updateField("departureAirport", event.target.value.toUpperCase())}
              placeholder="Departure airport"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
              required
            />
            <input
              type="datetime-local"
              value={form.departureDateTime}
              onChange={(event) => updateField("departureDateTime", event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="1"
              max="8"
              value={form.seatsAvailable}
              onChange={(event) => updateField("seatsAvailable", event.target.value)}
              placeholder="Seats available"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
              required
            />
            <input
              value={form.costSplit}
              onChange={(event) => updateField("costSplit", event.target.value)}
              placeholder='Cost split, ex. "$20 per rider" or "Shared Uber"'
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            />
          </div>

          <input
            value={form.meetingLocation}
            onChange={(event) => updateField("meetingLocation", event.target.value)}
            placeholder="Meeting location on campus"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            required
          />

          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Optional notes about luggage, timing, ride-share split, or pickup details"
            rows="5"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
          />

          {status ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{status}</div> : null}

          <button
            type="submit"
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Publish airport ride
          </button>
        </form>
      </section>

      <aside className="space-y-5">
        <div className="rounded-[32px] bg-ink p-6 text-white shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sand">Airport Finder</div>
          {selectedCollege ? (
            <div className="mt-4 space-y-4">
              <h2 className="text-2xl font-semibold">{selectedCollege.name}</h2>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-slate-300">Closest airport</div>
                <div className="mt-2 text-xl font-semibold">
                  {selectedCollege.airport_name} ({selectedCollege.airport_code})
                </div>
                <div className="mt-1 text-sm text-slate-300">{selectedCollege.airport_distance_miles} miles away</div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Select a college to auto-fill nearby airport suggestions using the built-in dataset.
            </p>
          )}
        </div>

        <div className="glass rounded-[32px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Map preview</div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Riders will use this meeting spot for a carpool or shared rideshare pickup.
          </p>
          {mapSrc ? (
            <iframe
              title="Meeting location map preview"
              src={mapSrc}
              className="mt-4 h-64 w-full rounded-[24px] border border-slate-200"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
              Add a meeting location to preview the map here.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
