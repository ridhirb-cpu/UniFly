import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState({
    upcomingBreaks: [],
    suggestedFlights: [],
    friendTravelers: 0,
    airportRides: [],
    deals: [],
    notifications: []
  });
  const [plans, setPlans] = useState([]);
  const [flightPlans, setFlightPlans] = useState([]);
  const [myRides, setMyRides] = useState({ created: [], joined: [] });
  const [selectedRideId, setSelectedRideId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [editingTripId, setEditingTripId] = useState("");
  const [tripDraft, setTripDraft] = useState({});

  useEffect(() => {
    if (!token) return;

    api.get("/dashboard", token).then(setDashboard).catch(() => null);
    api.get("/breaks/trip-plans/mine", token).then(setPlans).catch(() => setPlans([]));
    api.get("/rides/mine/list", token).then(setMyRides).catch(() => setMyRides({ created: [], joined: [] }));
    api.get("/flights/plans", token).then(setFlightPlans).catch(() => setFlightPlans([]));
  }, [token]);

  useEffect(() => {
    if (!selectedRideId || !token) {
      setMessages([]);
      return;
    }

    api
      .get(`/rides/${selectedRideId}/messages`, token)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [selectedRideId, token]);

  async function sendMessage() {
    const ride = myRides.joined.find((item) => String(item.id) === String(selectedRideId));
    if (!ride || !messageText.trim()) {
      return;
    }

    try {
      const newMessage = await api.post(
        `/rides/${ride.id}/messages`,
        {
          recipientId: ride.creator_id,
          content: messageText
        },
        token
      );
      setMessages((current) => [...current, newMessage]);
      setMessageText("");
      setMessageStatus("Message sent.");
    } catch (error) {
      setMessageStatus(error.message);
    }
  }

  async function saveTrip(trip) {
    try {
      const updated = await api.put(
        `/flights/plans/${trip.id}`,
        {
          title: tripDraft.title || trip.title,
          departureAirport: tripDraft.departure_airport || trip.departure_airport,
          startDate: tripDraft.start_date || trip.start_date,
          endDate: tripDraft.end_date || trip.end_date,
          destination: tripDraft.destination || trip.destination,
          selectedFlight: tripDraft.selected_flight || trip.selected_flight,
          notes: tripDraft.notes || trip.notes
        },
        token
      );
      setFlightPlans((current) => current.map((item) => (item.id === trip.id ? { ...item, ...updated } : item)));
      setEditingTripId("");
      setTripDraft({});
    } catch (error) {
      setMessageStatus(error.message);
    }
  }

  async function createRideFromTrip(trip) {
    try {
      await api.post(
        `/flights/plans/${trip.id}/add-ride`,
        {
          departureAirport: trip.departure_airport,
          departureDateTime: `${trip.start_date}T08:00`,
          meetingLocation: "Main student union pickup zone",
          notes: `Airport ride created from ${trip.title}`
        },
        token
      );
      setMessageStatus("Airport ride created from flight plan.");
      const rides = await api.get("/rides/mine/list", token);
      setMyRides(rides);
    } catch (error) {
      setMessageStatus(error.message);
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-[32px] border border-white/70 p-8 shadow-panel">
        <h1 className="text-3xl font-semibold text-ink">Your UniFly dashboard</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Log in to see your flight plans, airport rides, and campus-specific travel updates.
        </p>
        <Link to="/auth" className="mt-5 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
          Login / Signup
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-ink p-6 text-white shadow-panel sm:p-8">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sand">Dashboard</div>
        <h1 className="mt-2 text-3xl font-semibold">Welcome back, {user?.first_name || "student"}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Track your upcoming breaks, suggested flights home, friends traveling on the same dates, and optional airport rides.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Upcoming breaks</div>
          <div className="mt-4 space-y-3">
            {dashboard.upcomingBreaks.map((campusBreak) => (
              <div key={campusBreak.break_name} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold">{campusBreak.break_name}</div>
                <div>
                  {new Date(campusBreak.start_date).toLocaleDateString()} -{" "}
                  {new Date(campusBreak.end_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Suggested flights</div>
          <div className="mt-4 space-y-3">
            {dashboard.suggestedFlights.map((flight) => (
              <div key={flight.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold">
                  {flight.departure_airport} → {flight.arrival_airport}
                </div>
                <div>{flight.airline} {flight.flight_number}</div>
                <div>{flight.break_name} • ${flight.price}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Friends traveling same dates</div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-700">
            <div className="text-3xl font-semibold text-ink">{dashboard.friendTravelers}</div>
            <div className="mt-2">friends currently connected for shared break coordination.</div>
            <Link to="/friends" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-white">
              Open friends planner
            </Link>
          </div>
        </div>

        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel lg:col-span-3">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Notifications</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.notifications.length ? (
              dashboard.notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">{notification.title}</div>
                  <div className="mt-1">{notification.body}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Airport rides</div>
          <div className="mt-4 space-y-5 text-sm text-slate-600">
            <div>
              <div className="font-semibold text-ink">Created</div>
              <div className="mt-2 space-y-2">
                {myRides.created.map((ride) => (
                  <div key={`created-${ride.id}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                    {ride.departure_airport} • {new Date(ride.departure_datetime).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-ink">Joined</div>
              <div className="mt-2 space-y-2">
                {myRides.joined.map((ride) => (
                  <div key={`joined-${ride.id}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                    {ride.departure_airport} • {new Date(ride.departure_datetime).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Break-based plans</div>
          <div className="mt-4 space-y-3">
            {plans.length ? (
              plans.map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">{plan.title}</div>
                  <div>
                    {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                  </div>
                  <div>{plan.break_name || plan.college_name}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No saved trip plans yet. Use the break planner to create one.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
        <div className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-sea">Flight plans</div>
        <div className="grid gap-4 lg:grid-cols-2">
          {flightPlans.length ? (
            flightPlans.map((trip) => (
              <div key={trip.id} className="rounded-[24px] bg-slate-50 p-4">
                {editingTripId === String(trip.id) ? (
                  <div className="space-y-3">
                    <input
                      defaultValue={trip.title}
                      onChange={(event) => setTripDraft((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        defaultValue={trip.departure_airport}
                        onChange={(event) => setTripDraft((current) => ({ ...current, departure_airport: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                      <input
                        type="date"
                        defaultValue={trip.start_date}
                        onChange={(event) => setTripDraft((current) => ({ ...current, start_date: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                      <input
                        type="date"
                        defaultValue={trip.end_date}
                        onChange={(event) => setTripDraft((current) => ({ ...current, end_date: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                      <input
                        defaultValue={trip.destination}
                        onChange={(event) => setTripDraft((current) => ({ ...current, destination: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                    <input
                      defaultValue={trip.selected_flight}
                      onChange={(event) => setTripDraft((current) => ({ ...current, selected_flight: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                    <textarea
                      rows="3"
                      defaultValue={trip.notes}
                      onChange={(event) => setTripDraft((current) => ({ ...current, notes: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveTrip(trip)}
                        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                      >
                        Save edits
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTripId("");
                          setTripDraft({});
                        }}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-ink">{trip.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">Route: {trip.departure_airport} → {trip.destination || "TBD"}</div>
                    <div className="mt-1 text-sm text-slate-600">Flight: {trip.selected_flight}</div>
                    <div className="mt-1 text-sm text-slate-600">Participants: {trip.participants}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTripId(String(trip.id));
                          setTripDraft({});
                        }}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm"
                      >
                        Edit trip
                      </button>
                      <button
                        type="button"
                        onClick={() => createRideFromTrip(trip)}
                        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                      >
                        Add ride to airport
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
              No flight plans yet. Use Break Planner or Flights to start one.
            </div>
          )}
        </div>
      </section>

      <section className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Ride to Airport</div>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Optional airport rides linked to your flight plans and campus departures.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {myRides.joined.length ? (
              myRides.joined.map((ride) => (
                <button
                  key={`message-${ride.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedRideId(String(ride.id));
                    setMessageStatus("");
                  }}
                  className={`w-full rounded-2xl px-4 py-4 text-left text-sm transition ${
                    String(ride.id) === String(selectedRideId)
                      ? "bg-ink text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-semibold">{ride.departure_airport}</div>
                  <div>{new Date(ride.departure_datetime).toLocaleString()}</div>
                  <div>Host: {ride.creator_name}</div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Join a ride to unlock messaging.
              </div>
            )}
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            {selectedRideId ? (
              <>
                <div className="space-y-3">
                  {messages.length ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
                          message.sender_id === user.id
                            ? "ml-auto bg-sky text-white"
                            : "bg-white text-slate-700"
                        }`}
                      >
                        <div className="font-semibold">
                          {message.sender_first_name} {message.sender_last_name}
                        </div>
                        <div className="mt-1">{message.content}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                      No messages yet for this ride.
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    rows="3"
                    placeholder="Share luggage details, pickup timing, or flight updates"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={sendMessage}
                      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Send message
                    </button>
                    {messageStatus ? <div className="text-sm text-slate-600">{messageStatus}</div> : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-sm text-slate-500">
                Choose a joined ride to view the conversation.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
