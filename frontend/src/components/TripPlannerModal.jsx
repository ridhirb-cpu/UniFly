import { useEffect, useState } from "react";
import { AirportSearchSelect } from "./AirportSearchSelect";
import { FlightPurchaseModal } from "./FlightPurchaseModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const initialState = {
  title: "",
  departureAirport: "",
  destination: "",
  selectedFlight: "",
  startDate: "",
  endDate: "",
  notes: ""
};

export function TripPlannerModal({ open, overlap, friends, onClose, onSubmit }) {
  const { token } = useAuth();
  const [form, setForm] = useState(initialState);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availableFlights, setAvailableFlights] = useState([]);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [flightError, setFlightError] = useState("");
  const [purchaseFlight, setPurchaseFlight] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setSelectedParticipants([]);
      setError("");
      setSubmitting(false);
      setAvailableFlights([]);
      setLoadingFlights(false);
      setFlightError("");
      setPurchaseFlight(null);
      return;
    }

    if (overlap) {
      setForm({
        title: `${overlap.my_break_name} flight plan`,
        departureAirport: "",
        destination: "",
        selectedFlight: "",
        startDate: overlap.overlap_start,
        endDate: overlap.overlap_end,
        notes: `Planning the same flight window with ${overlap.friendName}`
      });
      setSelectedParticipants([overlap.friendId]);
      setError("");
    }
  }, [open, overlap]);

  useEffect(() => {
    if (!open) return;

    if (!token || !form.departureAirport || !form.destination || !form.startDate || !form.endDate) {
      setAvailableFlights([]);
      setFlightError("");
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingFlights(true);
        setFlightError("");
        const params = new URLSearchParams({
          departureAirport: form.departureAirport,
          destinationAirport: form.destination,
          startDate: form.startDate,
          endDate: form.endDate
        });
        const data = await api.get(`/flights/search?${params.toString()}`, token);
        setAvailableFlights(data.flights || []);
      } catch (loadError) {
        setAvailableFlights([]);
        setFlightError(loadError.message || "Unable to load flights for this route yet.");
      } finally {
        setLoadingFlights(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [open, token, form.departureAirport, form.destination, form.startDate, form.endDate]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function toggleParticipant(friendId) {
    setSelectedParticipants((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  }

  async function handleSave() {
    if (!form.title.trim() || !form.departureAirport.trim() || !form.destination.trim() || !form.selectedFlight.trim()) {
      setError("Enter a title, departure airport, destination airport, and selected flight before saving.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Choose both travel dates before saving.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date must be the same as or later than the start date.");
      return;
    }

    if (!selectedParticipants.length) {
      setError("Choose at least one participant for the collaborative flight plan.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onSubmit({
        ...form,
        participantIds: selectedParticipants
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to save the collaborative flight plan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto bg-slate-950/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass my-auto w-full max-w-2xl rounded-[32px] border border-white/70 p-6 shadow-panel sm:max-h-[90vh] sm:overflow-y-auto sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Plan Together</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Create a collaborative flight plan</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 overflow-visible">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Flight plan name"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
          />
          <div className="grid gap-4 sm:grid-cols-3 overflow-visible">
            <AirportSearchSelect
              value={form.departureAirport}
              onChange={(value) => setForm((current) => ({ ...current, departureAirport: value }))}
              label="Departure airport"
              placeholder="Choose departure"
            />
            <AirportSearchSelect
              value={form.destination}
              onChange={(value) => setForm((current) => ({ ...current, destination: value }))}
              label="Destination airport"
              placeholder="Choose destination"
            />
            <input
              value={form.selectedFlight}
              onChange={(event) => setForm((current) => ({ ...current, selectedFlight: event.target.value }))}
              placeholder="Choose from matching flights below or enter a flight"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10 self-end"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            />
          </div>
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            rows="4"
            placeholder="Notes for the group"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
          />

          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Matching Flights</div>
                <div className="mt-1 text-sm text-slate-600">
                  Choose the same flight together once both airports and travel dates are filled in.
                </div>
              </div>
              {loadingFlights ? <div className="text-sm font-semibold text-sky">Loading flights...</div> : null}
            </div>

            {!form.departureAirport || !form.destination || !form.startDate || !form.endDate ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Select departure and destination airports plus travel dates to load matching flights.
              </div>
            ) : flightError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{flightError}</div>
            ) : availableFlights.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {availableFlights.map((flight, index) => {
                  const selected = form.selectedFlight === `${flight.airline} ${flight.flight_number}`;
                  const flightKey = flight.id || `${flight.airline}-${flight.flight_number}-${index}`;
                  return (
                    <div
                      key={flightKey}
                      className={`rounded-2xl border px-4 py-4 text-sm ${
                        selected ? "border-sky bg-sky/10" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="font-semibold text-ink">
                        {flight.airline} {flight.flight_number}
                      </div>
                      <div className="mt-1 text-slate-600">
                        {flight.departure_airport} -&gt; {flight.arrival_airport}
                      </div>
                      <div className="mt-1 text-slate-600">
                        {new Date(flight.depart_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} -
                        {" "}
                        {new Date(flight.arrive_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div className="mt-1 text-slate-600">
                        {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`} • {flight.duration || "Timing shown at checkout"}
                      </div>
                      <div className="mt-3 text-base font-semibold text-ink">${flight.price}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              selectedFlight: `${flight.airline} ${flight.flight_number}`
                            }))
                          }
                          className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white"
                        >
                          {selected ? "Selected" : "Select flight"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPurchaseFlight(flight)}
                          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No flights match that route yet.
              </div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-700">Participants</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {friends.map((friend) => (
                <button
                  key={friend.friend_id}
                  type="button"
                  onClick={() => toggleParticipant(friend.friend_id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selectedParticipants.includes(friend.friend_id)
                      ? "border-sky bg-sky/10 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="font-semibold">
                    {friend.first_name} {friend.last_name}
                  </div>
                  <div>{friend.college_name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save collaborative flight"}
          </button>
          {overlap ? (
            <div className="rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-600">
              Same break window as {overlap.friendName}
            </div>
          ) : null}
        </div>
      </div>
      <FlightPurchaseModal flight={purchaseFlight} onClose={() => setPurchaseFlight(null)} />
    </div>
  );
}
