import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { RideCard } from "../components/RideCard";
import { CollegeSearchSelect } from "../components/CollegeSearchSelect";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function RidesPage() {
  const location = useLocation();
  const { token } = useAuth();
  const [rides, setRides] = useState([]);
  const [myRides, setMyRides] = useState({ created: [], joined: [] });
  const [filters, setFilters] = useState({ collegeId: "", date: "", airport: "" });
  const [message, setMessage] = useState("");
  const [pendingRide, setPendingRide] = useState(location.state?.prefillRide || null);

  useEffect(() => {
    if (location.state?.prefillRide) {
      setPendingRide(location.state.prefillRide);
      setFilters((current) => ({
        ...current,
        airport: location.state.prefillRide.departureAirport || current.airport,
        date: location.state.prefillRide.departureDate || current.date
      }));
    }
    if (location.state?.message) {
      setMessage(location.state.message);
    }
  }, [location.state]);

  async function loadRides() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const data = await api.get(`/rides?${params.toString()}`);
    setRides(data);
  }

  async function loadMyRides() {
    if (!token) {
      setMyRides({ created: [], joined: [] });
      return;
    }

    const data = await api.get("/rides/mine/list", token);
    setMyRides({
      created: data.created || [],
      joined: data.joined || []
    });
  }

  useEffect(() => {
    loadRides().catch(() => setRides([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMyRides().catch(() => setMyRides({ created: [], joined: [] }));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRides().catch(() => setRides([]));
    }, 200);

    return () => clearTimeout(timer);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleJoin(ride) {
    if (!token) {
      setMessage("Please log in to join an airport ride.");
      return;
    }

    try {
      await api.post(`/rides/${ride.id}/join`, {}, token);
      setMessage("You joined the airport ride.");
      loadRides();
      loadMyRides();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleLeaveRide(ride) {
    try {
      await api.post(`/rides/${ride.id}/leave`, {}, token);
      setMessage("You left the airport ride.");
      loadRides();
      loadMyRides();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCancelRide(ride) {
    try {
      await api.post(`/rides/${ride.id}/cancel`, {}, token);
      setMessage("Airport ride canceled.");
      loadRides();
      loadMyRides();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const visibleRides = useMemo(() => rides, [rides]);
  const joinedRideIds = useMemo(() => new Set(myRides.joined.map((ride) => ride.id)), [myRides.joined]);
  const createdRideIds = useMemo(() => new Set(myRides.created.map((ride) => ride.id)), [myRides.created]);

  return (
    <div className="space-y-6">
      <section className="glass rounded-[32px] border border-white/70 p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Airport Ride</div>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Optional rides to the airport</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Flight planning comes first. Use this secondary board when you want to split a ride to the airport with other students.
            </p>
          </div>
          <Link
            to="/create-ride"
            state={pendingRide ? { prefillRide: pendingRide } : null}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Create airport ride
          </Link>
        </div>

        {pendingRide ? (
          <div className="mt-5 rounded-[24px] border border-sky/30 bg-sky/10 p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Ready for airport ride</div>
            <div className="mt-2 text-lg font-semibold text-ink">{pendingRide.flightNumber}</div>
            <div className="mt-1 text-sm text-slate-700">
              {pendingRide.departureAirport} -&gt; {pendingRide.arrivalAirport} on {new Date(pendingRide.departureDate).toLocaleDateString()}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Continue to the airport-ride form to turn this flight into a carpool or shared Uber/Lyft plan.
            </div>
            <Link
              to="/create-ride"
              state={{ prefillRide: pendingRide }}
              className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Continue creating airport ride
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          <CollegeSearchSelect
            value={filters.collegeId}
            onChange={(collegeId) => setFilters((current) => ({ ...current, collegeId }))}
            label="Filter rides by college"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            />
            <input
              value={filters.airport}
              onChange={(event) => setFilters((current) => ({ ...current, airport: event.target.value.toUpperCase() }))}
              placeholder="Airport code"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            />
          </div>
        </div>

        {message ? <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</div> : null}
      </section>

      {token ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Joined rides</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Rides you are already in</h2>
            <div className="mt-4 grid gap-4">
              {myRides.joined.length ? (
                myRides.joined.map((ride) => (
                  <RideCard key={ride.id} ride={ride} membershipLabel="Joined" secondaryActionLabel="Leave ride" onSecondaryAction={handleLeaveRide} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                  Joined rides will appear here after you join them.
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Your created rides</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Airport rides you published</h2>
            <div className="mt-4 grid gap-4">
              {myRides.created.length ? (
                myRides.created.map((ride) => (
                  <RideCard key={ride.id} ride={ride} membershipLabel="Created by you" secondaryActionLabel="Cancel ride" onSecondaryAction={handleCancelRide} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                  Create an airport ride to see it listed here.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        {visibleRides.length ? (
          visibleRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              onJoin={handleJoin}
              membershipLabel={createdRideIds.has(ride.id) ? "Created by you" : joinedRideIds.has(ride.id) ? "Joined" : ""}
              disableJoin={createdRideIds.has(ride.id) || joinedRideIds.has(ride.id)}
            />
          ))
        ) : (
          <div className="glass rounded-[28px] border border-dashed border-slate-300 p-8 text-sm text-slate-600">
            No airport rides match these filters yet.
          </div>
        )}
      </section>
    </div>
  );
}
