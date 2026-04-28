import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeAirportSearch } from "../components/AirportSearchSelect";
import { FlightPurchaseModal } from "../components/FlightPurchaseModal";
import { CollegeSearchSelect } from "../components/CollegeSearchSelect";
import { TripPlannerModal } from "../components/TripPlannerModal";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function BreakPlannerPage() {
  const navigate = useNavigate();
  const { token, user, setUser } = useAuth();
  const [collegeId, setCollegeId] = useState(user?.college_id ? String(user.college_id) : "");
  const [breaks, setBreaks] = useState([]);
  const [friendBreaks, setFriendBreaks] = useState({ friends: [], overlaps: [] });
  const [flightResults, setFlightResults] = useState({});
  const [homeAirport, setHomeAirport] = useState(user?.home_airport || "");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedOverlap, setSelectedOverlap] = useState(null);
  const [purchaseFlight, setPurchaseFlight] = useState(null);
  const [selectedFlightKey, setSelectedFlightKey] = useState("");
  const [savingHomeAirport, setSavingHomeAirport] = useState(false);
  const [loadingBreakId, setLoadingBreakId] = useState(null);
  const [savingFlightKey, setSavingFlightKey] = useState("");
  const [editingBreakId, setEditingBreakId] = useState(null);
  const [breakDraft, setBreakDraft] = useState({ startDate: "", endDate: "" });
  const [savingBreakId, setSavingBreakId] = useState(null);

  useEffect(() => {
    if (user?.college_id) {
      setCollegeId(String(user.college_id));
    }
    if (user?.home_airport) {
      setHomeAirport(user.home_airport);
    }
  }, [user]);

  useEffect(() => {
    if (!collegeId) return;
    api.get(`/breaks?collegeId=${collegeId}`).then(setBreaks).catch(() => setBreaks([]));
  }, [collegeId]);

  useEffect(() => {
    if (!token) return;
    api.get("/friends/breaks", token).then(setFriendBreaks).catch(() => setFriendBreaks({ friends: [], overlaps: [] }));
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

  const groupedBreaks = useMemo(() => breaks, [breaks]);

  async function saveHomeAirport() {
    if (!token) {
      setStatus({ type: "error", message: "Please log in before saving a home airport." });
      return;
    }

    if (!homeAirport.trim()) {
      setStatus({ type: "error", message: "Select a home airport before saving." });
      return;
    }

    try {
      setSavingHomeAirport(true);
      const updatedUser = await api.put("/auth/home-airport", { homeAirport }, token);
      setUser(updatedUser);
      setStatus({ type: "success", message: "Home airport saved." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSavingHomeAirport(false);
    }
  }

  async function loadBreakFlights(campusBreak) {
    if (!token) {
      setStatus({ type: "error", message: "Please log in before searching for flights." });
      return;
    }

    if (!collegeId) {
      setStatus({ type: "error", message: "Choose a college calendar before searching for flights." });
      return;
    }

    if (!homeAirport) {
      setStatus({ type: "error", message: "Save a home airport first." });
      return;
    }

    try {
      setLoadingBreakId(campusBreak.id);
      const data = await api.get(`/flights/suggestions?breakId=${campusBreak.id}&homeAirport=${homeAirport}`, token);
      const flights = data.flights || [];
      setFlightResults((current) => ({
        ...current,
        [campusBreak.id]: { flights }
      }));
      setStatus({
        type: "success",
        message: flights.length
          ? `Found ${flights.length} flight option${flights.length === 1 ? "" : "s"} for ${campusBreak.break_name}.`
          : `No flights found for ${campusBreak.break_name} yet.`
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoadingBreakId(null);
    }
  }

  async function handleCollaborativePlan(form) {
    try {
      await api.post(
        "/flights/plans",
        {
          breakId: selectedOverlap?.breakId || null,
          title: form.title,
          departureAirport: form.departureAirport,
          selectedFlight: form.selectedFlight,
          startDate: form.startDate,
          endDate: form.endDate,
          destination: form.destination,
          notes: form.notes,
          participantIds: form.participantIds
        },
        token
      );
      setStatus({ type: "success", message: "Collaborative flight plan created." });
      setPlannerOpen(false);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function saveFlightPlan({ flight, title, breakId = null, notes = "", participantIds = [] }) {
    if (!token) {
      setStatus({ type: "error", message: "Please log in before saving a flight plan." });
      return null;
    }

    const persistedFlightId = Number.isInteger(Number(flight.id)) ? Number(flight.id) : null;

    try {
      return await api.post(
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
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      return null;
    }
  }

  async function planFlight(campusBreak, flight, flightKey) {
    try {
      setSavingFlightKey(flightKey);
      const created = await saveFlightPlan({
        flight,
        breakId: campusBreak.id,
        title: `${campusBreak.break_name} flight home`,
        notes: `Flight selected for ${campusBreak.break_name}`
      });

      if (created) {
        setSelectedFlightKey(flightKey);
        setStatus({ type: "success", message: `Flight selected for ${campusBreak.break_name}. You can review rides in Airport Rides.` });
      }
    } finally {
      setSavingFlightKey("");
    }
  }

  async function addRideOnFlightSelection(campusBreak, flight, flightKey) {
    try {
      setSavingFlightKey(flightKey);
      const created = await saveFlightPlan({
        flight,
        breakId: campusBreak.id,
        title: `${campusBreak.break_name} airport transfer`,
        notes: "Flight selected with airport ride add-on"
      });

      if (!created) return;

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
          message: `Flight selected for ${campusBreak.break_name}. Continue in Airport Rides to create the airport transfer.`
        }
      });
    } finally {
      setSavingFlightKey("");
    }
  }

  async function saveBreakDates(campusBreak) {
    try {
      setSavingBreakId(campusBreak.id);
      const updated = await api.put(
        `/breaks/${campusBreak.id}`,
        {
          startDate: breakDraft.startDate,
          endDate: breakDraft.endDate
        },
        token
      );
      setBreaks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingBreakId(null);
      setStatus({ type: "success", message: `${campusBreak.break_name} dates updated.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSavingBreakId(null);
    }
  }

  const statusStyles =
    status.type === "error"
      ? "bg-rose-50 text-rose-700"
      : status.type === "success"
        ? "bg-sky-50 text-sky-800"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="space-y-6 overflow-visible">
      <section className="glass relative z-10 overflow-visible rounded-[32px] border border-white/70 p-6 shadow-panel">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Break Planner</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Plan travel around school breaks</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Select a college to view fall break, Thanksgiving, winter break, and spring break dates, then compare those windows against suggested flights home.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <CollegeSearchSelect value={collegeId} onChange={setCollegeId} label="Choose a college calendar" />
          <div className="space-y-3">
            <HomeAirportSearch
              value={homeAirport}
              onChange={setHomeAirport}
              label="Search Home Airport"
              placeholder="Search Home Airport"
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

      <section className="grid gap-5 lg:grid-cols-2">
        {groupedBreaks.length === 0 ? (
          <div className="glass rounded-[28px] border border-dashed border-slate-300 p-6 text-sm text-slate-600 lg:col-span-2">
            No verified undergraduate break data is available for this college yet. UniFly now shows only registrar-backed calendars with source links instead of generated dates.
          </div>
        ) : null}
        {groupedBreaks.map((campusBreak) => {
          const flights = Array.isArray(flightResults[campusBreak.id]?.flights) ? flightResults[campusBreak.id].flights : [];

          return (
            <article key={campusBreak.id} className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">{campusBreak.break_name}</div>
                  {editingBreakId === campusBreak.id ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        value={breakDraft.startDate}
                        onChange={(event) => setBreakDraft((current) => ({ ...current, startDate: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                      <input
                        type="date"
                        value={breakDraft.endDate}
                        onChange={(event) => setBreakDraft((current) => ({ ...current, endDate: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="mt-2 text-2xl font-semibold text-ink">
                        {new Date(campusBreak.start_date).toLocaleDateString()} to {new Date(campusBreak.end_date).toLocaleDateString()}
                      </h2>
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
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingBreakId === campusBreak.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveBreakDates(campusBreak)}
                        disabled={savingBreakId === campusBreak.id}
                        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {savingBreakId === campusBreak.id ? "Saving..." : "Save dates"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBreakId(null)}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBreakId(campusBreak.id);
                          setBreakDraft({
                            startDate: campusBreak.start_date,
                            endDate: campusBreak.end_date
                          });
                        }}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Adjust break
                      </button>
                      <button
                        type="button"
                        onClick={() => loadBreakFlights(campusBreak)}
                        disabled={loadingBreakId === campusBreak.id}
                        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {loadingBreakId === campusBreak.id ? "Loading..." : "Find Flights"}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {flights.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 lg:col-span-3">
                    {homeAirport ? "Suggested flights will appear here for this break." : "Save your home airport to see suggested flights."}
                  </div>
                )}

                {flights.map((flight, index) => {
                  const flightKey = `${campusBreak.id}-${flight.id || `${flight.airline}-${flight.flight_number}-${index}`}`;
                  const isSelected = selectedFlightKey === flightKey;

                  return (
                    <div
                      key={flightKey}
                      className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700"
                    >
                      <div className="font-semibold text-ink">
                        {flight.airline} {flight.flight_number}
                      </div>
                      <div className="mt-1">
                        {flight.departure_airport} -&gt; {flight.arrival_airport}
                      </div>
                      <div className="mt-1">
                        Depart {new Date(flight.depart_date).toLocaleDateString()}
                      </div>
                      <div>
                        Return {new Date(flight.return_date).toLocaleDateString()}
                      </div>
                      <div className="mt-2 text-base font-semibold text-ink">
                        ${flight.price}
                      </div>
                      <div className="mt-1 text-slate-600">
                        {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`} • {flight.duration || "Timing shown at checkout"}
                      </div>
                      {isSelected ? <div className="mt-3 text-sm font-semibold text-sky">Selected for your plan</div> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingFlightKey === flightKey}
                          onClick={() => planFlight(campusBreak, flight, flightKey)}
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
                          onClick={() => addRideOnFlightSelection(campusBreak, flight, flightKey)}
                          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                        >
                          Add ride to airport
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="glass relative z-0 rounded-[32px] border border-white/70 p-6 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Friends' Breaks</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">See where schedules align</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Only accepted friends appear here. UniFly highlights overlapping school breaks automatically so you can plan flights together.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedOverlap(null);
              setPlannerOpen(true);
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            New shared flight
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            {friendBreaks.friends.length ? (
              friendBreaks.friends.map((friend) => (
                <div key={friend.friend_id} className="rounded-[24px] bg-slate-50 px-4 py-4">
                  <div className="font-semibold text-ink">
                    {friend.first_name} {friend.last_name}
                  </div>
                  <div className="text-sm text-slate-600">{friend.college_name}</div>
                  <div className="mt-3 grid gap-2">
                    {friend.breaks.map((campusBreak) => (
                      <div key={campusBreak.id} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                        <div className="font-medium">{campusBreak.break_name}</div>
                        <div>
                          {new Date(campusBreak.start_date).toLocaleDateString()} - {new Date(campusBreak.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                Add friends to compare schedules and plan shared breaks.
              </div>
            )}
          </div>

          <div className="space-y-3">
            {friendBreaks.overlaps.length ? (
              friendBreaks.overlaps.map((overlap, index) => (
                <div
                  key={`${overlap.friendId}-${overlap.my_break_name}-${index}`}
                  className={`rounded-[24px] border px-4 py-4 ${
                    /spring|winter/i.test(overlap.my_break_name) ? "border-sky/40 bg-sky/10" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">{overlap.my_break_name}</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{overlap.message}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Shared dates: {new Date(overlap.overlap_start).toLocaleDateString()} - {new Date(overlap.overlap_end).toLocaleDateString()}
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
                No overlapping breaks detected yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <TripPlannerModal
        open={plannerOpen}
        overlap={selectedOverlap}
        friends={friendBreaks.friends}
        onClose={() => setPlannerOpen(false)}
        onSubmit={handleCollaborativePlan}
      />
      <FlightPurchaseModal flight={purchaseFlight} onClose={() => setPurchaseFlight(null)} />
    </div>
  );
}
