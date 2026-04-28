import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AirportSearchSelect } from "../components/AirportSearchSelect";
import { CollegeSearchSelect } from "../components/CollegeSearchSelect";
import { FlightPurchaseModal } from "../components/FlightPurchaseModal";
import { TripPlannerModal } from "../components/TripPlannerModal";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const emptyManualSearch = {
  departureAirport: "",
  destinationAirport: "",
  startDate: "",
  endDate: ""
};

export function RideBoardPage() {
  const navigate = useNavigate();
  const { token, user, setUser } = useAuth();
  const [collegeId, setCollegeId] = useState("");
  const [breaks, setBreaks] = useState([]);
  const [flightResults, setFlightResults] = useState({});
  const [manualSearch, setManualSearch] = useState(emptyManualSearch);
  const [manualFlights, setManualFlights] = useState([]);
  const [flightPlans, setFlightPlans] = useState([]);
  const [friendOverlaps, setFriendOverlaps] = useState([]);
  const [homeAirport, setHomeAirport] = useState("");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedFlightKey, setSelectedFlightKey] = useState("");
  const [purchaseFlight, setPurchaseFlight] = useState(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedOverlap, setSelectedOverlap] = useState(null);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [savingHomeAirport, setSavingHomeAirport] = useState(false);
  const [manualSearchLoading, setManualSearchLoading] = useState(false);
  const [breakLoadingId, setBreakLoadingId] = useState(null);
  const [savingFlightKey, setSavingFlightKey] = useState("");
  const [manualSearchAttempted, setManualSearchAttempted] = useState(false);
  const savedPlansRef = useRef(null);

  useEffect(() => {
    if (user?.college_id) {
      setCollegeId(String(user.college_id));
    }
    if (user?.home_airport) {
      setHomeAirport(user.home_airport);
      setManualSearch((current) => ({ ...current, destinationAirport: user.home_airport }));
    }
  }, [user]);

  useEffect(() => {
    if (!collegeId) return;
    api.get(`/breaks?collegeId=${collegeId}`).then(setBreaks).catch(() => setBreaks([]));
  }, [collegeId]);

  useEffect(() => {
    if (!token) return;
    api.get("/flights/plans", token).then(setFlightPlans).catch(() => setFlightPlans([]));
    api.get("/flights/friends-overlaps", token).then(setFriendOverlaps).catch(() => setFriendOverlaps([]));
  }, [token]);

  useEffect(() => {
    if (!token || !homeAirport || !breaks.length) return;

    Promise.all(
      breaks.map((campusBreak) =>
        api
          .get(`/flights/suggestions?breakId=${campusBreak.id}&homeAirport=${homeAirport}`, token)
          .then((data) => [campusBreak.id, { flights: data.flights || [] }])
      )
    )
      .then((entries) => setFlightResults(Object.fromEntries(entries)))
      .catch(() => setFlightResults({}));
  }, [token, breaks, homeAirport]);

  function setError(message) {
    setStatus({ type: "error", message });
  }

  function setSuccess(message) {
    setStatus({ type: "success", message });
  }

  async function saveHomeAirport() {
    if (!token) {
      setError("Please log in before saving a home airport.");
      return;
    }

    if (!homeAirport.trim()) {
      setError("Select a home airport before saving.");
      return;
    }

    try {
      setSavingHomeAirport(true);
      const updatedUser = await api.put("/auth/home-airport", { homeAirport }, token);
      setUser(updatedUser);
      setManualSearch((current) => ({ ...current, destinationAirport: updatedUser.home_airport || homeAirport }));
      setSuccess("Home airport saved.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSavingHomeAirport(false);
    }
  }

  async function saveFlightPlan({ flight, title, breakId = null, notes = "", participantIds = [] }) {
    if (!token) {
      setError("Please log in before saving a flight plan.");
      return null;
    }

    const persistedFlightId = Number.isInteger(Number(flight.id)) ? Number(flight.id) : null;

    try {
      const created = await api.post(
        "/flights/plans",
        {
          breakId,
          flightId: persistedFlightId,
          title,
          departureAirport: flight.departure_airport,
          destination: flight.arrival_airport,
          selectedFlight: `${flight.airline} ${flight.flight_number}`,
          startDate: flight.depart_date,
          endDate: flight.return_date,
          notes,
          participantIds
        },
        token
      );
      setFlightPlans((current) => [created, ...current]);
      return created;
    } catch (error) {
      setError(error.message);
      return null;
    }
  }

  async function planFlight(flight, campusBreak) {
    const flightKey = `${campusBreak.id}-${flight.id || `${flight.airline}-${flight.flight_number}`}`;

    try {
      setSavingFlightKey(flightKey);
      const created = await saveFlightPlan({
        flight,
        title: `${campusBreak.break_name} flight home`,
        breakId: campusBreak.id,
        notes: `Flight selected for ${campusBreak.break_name}`
      });

      if (created) {
        setSelectedFlight({ ...flight, planId: created.id });
        setSelectedFlightKey(flightKey);
        setSuccess(`Flight selected for ${campusBreak.break_name}. Your saved plan is ready below.`);
      }
    } finally {
      setSavingFlightKey("");
    }
  }

  async function addRideOnFlightSelection(flight, title, breakId = null) {
    const flightKey = `${breakId || "manual"}-${flight.id || `${flight.airline}-${flight.flight_number}`}`;

    try {
      setSavingFlightKey(flightKey);
      const created = await saveFlightPlan({
        flight,
        title,
        breakId,
        notes: "Flight selected with airport ride add-on"
      });

      if (!created) return;

      setSelectedFlight({ ...flight, planId: created.id });
      setSelectedFlightKey(flightKey);
      navigate("/rides", {
        state: {
          prefillRide: {
            planId: created.id,
            flightId: flight.id || null,
            flightNumber: `${flight.airline} ${flight.flight_number}`,
            departureAirport: flight.departure_airport,
            arrivalAirport: flight.arrival_airport,
            departureDate: flight.depart_date,
            returnDate: flight.return_date
          },
          message: "Flight selected. You can now continue in Airport Rides and create the airport transfer."
        }
      });
    } finally {
      setSavingFlightKey("");
    }
  }

  async function runManualSearch() {
    if (!manualSearch.departureAirport || !manualSearch.destinationAirport || !manualSearch.startDate || !manualSearch.endDate) {
      setError("Choose departure airport, destination airport, departure date, and return date before searching.");
      return;
    }

    if (manualSearch.endDate < manualSearch.startDate) {
      setError("Return date must be the same as or later than the departure date.");
      return;
    }

    try {
      setManualSearchAttempted(true);
      setManualSearchLoading(true);
      const params = new URLSearchParams({
        departureAirport: manualSearch.departureAirport,
        destinationAirport: manualSearch.destinationAirport,
        startDate: manualSearch.startDate,
        endDate: manualSearch.endDate
      });
      const data = await api.get(`/flights/search?${params.toString()}`, token);
      const flights = data.flights || [];
      setManualFlights(flights);
      setSuccess(
        flights.length
          ? `Found ${flights.length} flight option${flights.length === 1 ? "" : "s"}.`
          : "No matching flights found for those airports and dates."
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setManualSearchLoading(false);
    }
  }

  async function loadBreakFlights(campusBreak) {
    if (!homeAirport) {
      setError("Save a home airport first.");
      return;
    }

    try {
      setBreakLoadingId(campusBreak.id);
      const data = await api.get(`/flights/suggestions?breakId=${campusBreak.id}&homeAirport=${homeAirport}`, token);
      const flights = data.flights || [];
      setFlightResults((current) => ({ ...current, [campusBreak.id]: { flights } }));
      setSuccess(
        flights.length
          ? `Found ${flights.length} flight option${flights.length === 1 ? "" : "s"} for ${campusBreak.break_name}.`
          : `No flights found for ${campusBreak.break_name} yet.`
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBreakLoadingId(null);
    }
  }

  async function handleCollaborativePlan(form) {
    try {
      const created = await api.post(
        "/flights/plans",
        {
          breakId: selectedOverlap?.breakId || null,
          title: form.title,
          departureAirport: form.departureAirport,
          destination: form.destination,
          selectedFlight: form.selectedFlight,
          startDate: form.startDate,
          endDate: form.endDate,
          notes: form.notes,
          participantIds: form.participantIds
        },
        token
      );
      setFlightPlans((current) => [created, ...current]);
      setPlannerOpen(false);
      setSuccess("Shared flight plan created.");
    } catch (error) {
      setError(error.message);
    }
  }

  const orderedBreaks = useMemo(() => breaks, [breaks]);
  const statusStyles =
    status.type === "error"
      ? "bg-rose-50 text-rose-700"
      : status.type === "success"
        ? "bg-sky-50 text-sky-800"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="space-y-6 overflow-visible">
      <section className="glass relative z-10 overflow-visible rounded-[32px] border border-white/70 p-6 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Flights</div>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Find flights home based on your break calendar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              UniFly uses your school breaks, nearest airport, and home airport to suggest flights first. Airport rides are a secondary add-on after you choose a flight, and they can be a campus carpool or a shared Uber or Lyft split.
            </p>
          </div>
          <Link to="/rides" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            View airport rides
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CollegeSearchSelect value={collegeId} onChange={setCollegeId} label="Choose a college break calendar" />
          <div className="space-y-3">
            <AirportSearchSelect
              value={homeAirport}
              onChange={setHomeAirport}
              label="Home airport"
              placeholder="Search home airport"
            />
            <button
              type="button"
              onClick={saveHomeAirport}
              disabled={savingHomeAirport}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingHomeAirport ? "Saving..." : "Save home airport"}
            </button>
          </div>
        </div>

        {status.message ? <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${statusStyles}`}>{status.message}</div> : null}
      </section>

      <section className="glass relative z-[5] overflow-visible rounded-[28px] border border-white/70 p-6 shadow-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Manual flight search</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Search airports directly</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Use airport typeahead to compare mock flight options for exact departure and destination airports.
            </p>
          </div>
          <button
            type="button"
            onClick={runManualSearch}
            disabled={manualSearchLoading}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {manualSearchLoading ? "Searching..." : "Find Flights"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <AirportSearchSelect
            value={manualSearch.departureAirport}
            onChange={(value) => setManualSearch((current) => ({ ...current, departureAirport: value }))}
            label="Departure airport"
            placeholder="Search departure airport"
          />
          <AirportSearchSelect
            value={manualSearch.destinationAirport}
            onChange={(value) => setManualSearch((current) => ({ ...current, destinationAirport: value }))}
            label="Destination airport"
            placeholder="Search destination airport"
          />
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">Departure date</label>
            <input
              type="date"
              value={manualSearch.startDate}
              onChange={(event) => setManualSearch((current) => ({ ...current, startDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            />
          </div>
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">Return date</label>
            <input
              type="date"
              value={manualSearch.endDate}
              onChange={(event) => setManualSearch((current) => ({ ...current, endDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {manualFlights.length ? (
            manualFlights.map((flight, index) => {
              const flightKey = `manual-${flight.id || `${flight.airline}-${flight.flight_number}-${index}`}`;
              const isSelected = selectedFlightKey === flightKey;
              return (
                <div key={flightKey} className={`rounded-[24px] p-4 ${isSelected ? "border border-sky bg-sky/10" : "bg-slate-50"}`}>
                  <div className="text-sm font-semibold text-sea">{flight.airline}</div>
                  <div className="mt-2 text-xl font-semibold text-ink">{flight.departure_airport} -&gt; {flight.arrival_airport}</div>
                  <div className="mt-2 text-sm text-slate-600">{flight.flight_number} • {flight.travel_class}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Depart {new Date(flight.depart_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-slate-600">
                    Arrive {new Date(flight.arrive_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-ink">${flight.price}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`} • {flight.duration || "Timing shown at checkout"}
                  </div>
                  {isSelected ? <div className="mt-3 text-sm font-semibold text-sky">Selected for your plan</div> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingFlightKey === flightKey}
                      onClick={async () => {
                        setSavingFlightKey(flightKey);
                        try {
                          const created = await saveFlightPlan({
                            flight,
                            title: `Flight from ${flight.departure_airport} to ${flight.arrival_airport}`,
                            notes: "Manual airport search selection"
                          });

                          if (created) {
                            setSelectedFlight({ ...flight, planId: created.id });
                            setSelectedFlightKey(flightKey);
                            setSuccess("Flight selected and saved to your plans.");
                          }
                        } finally {
                          setSavingFlightKey("");
                        }
                      }}
                      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {savingFlightKey === flightKey ? "Saving..." : isSelected ? "Flight Selected" : "Select Flight"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchaseFlight(flight)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      View details & purchase
                    </button>
                    <button
                      type="button"
                      disabled={savingFlightKey === flightKey}
                      onClick={() => addRideOnFlightSelection(flight, `Airport ride for ${flight.departure_airport} flight`)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Add ride to airport
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 lg:col-span-2 xl:col-span-4">
              {manualSearchAttempted
                ? "No flight options matched that airport and date combination."
                : "Search two airports and dates to load mock flight options."}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5">
        {orderedBreaks.length === 0 ? (
          <div className="glass rounded-[28px] border border-dashed border-slate-300 p-6 text-sm text-slate-600">
            This college does not have a verified undergraduate break calendar in UniFly yet, so break-based flight suggestions are unavailable for now.
          </div>
        ) : null}
        {orderedBreaks.map((campusBreak) => {
          const flights = Array.isArray(flightResults[campusBreak.id]?.flights) ? flightResults[campusBreak.id].flights : [];

          return (
            <article key={campusBreak.id} className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">{campusBreak.break_name}</div>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    {new Date(campusBreak.start_date).toLocaleDateString()} to {new Date(campusBreak.end_date).toLocaleDateString()}
                  </h2>
                  <div className="mt-2 text-sm text-slate-600">Nearest campus airport is used automatically for these flight suggestions.</div>
                  {campusBreak.source ? (
                    <a
                      href={campusBreak.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-sky underline-offset-4 hover:underline"
                    >
                      Official calendar source
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => loadBreakFlights(campusBreak)}
                  disabled={breakLoadingId === campusBreak.id}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {breakLoadingId === campusBreak.id ? "Loading..." : "Find Flights"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {flights.length ? (
                  flights.map((flight, index) => {
                    const flightKey = `${campusBreak.id}-${flight.id || `${flight.airline}-${flight.flight_number}-${index}`}`;
                    const isSelected = selectedFlightKey === flightKey;
                    return (
                      <div key={flightKey} className={`rounded-[24px] p-4 ${isSelected ? "border border-sky bg-sky/10" : "bg-slate-50"}`}>
                        <div className="text-sm font-semibold text-sea">{flight.airline}</div>
                        <div className="mt-2 text-xl font-semibold text-ink">{flight.departure_airport} -&gt; {flight.arrival_airport}</div>
                        <div className="mt-2 text-sm text-slate-600">{flight.flight_number} • {flight.travel_class}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Depart {new Date(flight.depart_date).toLocaleDateString()} • Return {new Date(flight.return_date).toLocaleDateString()}
                        </div>
                        <div className="mt-4 text-2xl font-semibold text-ink">${flight.price}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`} • {flight.duration || "Timing shown at checkout"}
                        </div>
                        {isSelected ? <div className="mt-3 text-sm font-semibold text-sky">Selected for your plan</div> : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingFlightKey === flightKey}
                            onClick={() => planFlight({ ...flight, key: flightKey }, campusBreak)}
                            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {savingFlightKey === flightKey ? "Saving..." : isSelected ? "Flight Selected" : "Select Flight"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPurchaseFlight(flight)}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            View details & purchase
                          </button>
                          <button
                            type="button"
                            disabled={savingFlightKey === flightKey}
                            onClick={() => addRideOnFlightSelection({ ...flight, key: flightKey }, `${campusBreak.break_name} airport transfer`, campusBreak.id)}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                          >
                            Add ride to airport
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 lg:col-span-3">
                    {homeAirport ? "Flight suggestions will appear here for this break." : "Save a home airport to see suggested flights."}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Friends traveling same dates</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Coordinate flights on overlapping breaks</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {friendOverlaps.length ? (
            friendOverlaps.map((overlap, index) => (
              <div key={`${overlap.friendId}-${index}`} className="rounded-[24px] bg-slate-50 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">{overlap.my_break_name}</div>
                <div className="mt-2 text-lg font-semibold text-ink">{overlap.message}</div>
                <div className="mt-2 text-sm text-slate-600">
                  Suggested same departure dates: {new Date(overlap.overlap_start).toLocaleDateString()} to {new Date(overlap.overlap_end).toLocaleDateString()}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOverlap(overlap);
                    setPlannerOpen(true);
                  }}
                  className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Plan Flight Together
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
              No overlapping friend breaks found yet.
            </div>
          )}
        </div>
      </section>

      <section ref={savedPlansRef} className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Saved flight plans</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {flightPlans.length ? (
            flightPlans.map((plan) => (
              <div key={plan.id} className="rounded-[24px] bg-slate-50 p-4">
                <div className="font-semibold text-ink">{plan.title}</div>
                <div className="mt-1 text-sm text-slate-600">{plan.departure_airport} -&gt; {plan.destination}</div>
                <div className="mt-1 text-sm text-slate-600">{plan.selected_flight}</div>
                <div className="mt-1 text-sm text-slate-600">{new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}</div>
                <div className="mt-1 text-sm text-slate-600">Participants: {plan.participants}</div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
              Select a flight to save your first plan.
            </div>
          )}
        </div>
      </section>

      <TripPlannerModal
        open={plannerOpen}
        overlap={selectedOverlap}
        friends={friendOverlaps.map((overlap) => ({
          friend_id: overlap.friendId,
          first_name: overlap.friendName.split(" ")[0],
          last_name: overlap.friendName.split(" ").slice(1).join(" "),
          college_name: overlap.friendCollege
        }))}
        onClose={() => setPlannerOpen(false)}
        onSubmit={handleCollaborativePlan}
      />
      <FlightPurchaseModal flight={purchaseFlight} onClose={() => setPurchaseFlight(null)} />
    </div>
  );
}
