import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function FriendsPage() {
  const { token } = useAuth();
  const [friendData, setFriendData] = useState({ friends: [], incoming: [], outgoing: [] });
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  async function loadFriends() {
    if (!token) return;
    const data = await api.get("/friends", token);
    setFriendData(data);
  }

  useEffect(() => {
    loadFriends().catch(() => null);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!query.trim() || !token) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      api
        .get(`/friends/search?query=${encodeURIComponent(query)}`, token)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token]);

  async function sendRequest(receiverId) {
    try {
      await api.post("/friends/requests", { receiverId }, token);
      setStatus("Friend request sent.");
      loadFriends();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function respond(requestId, action) {
    try {
      await api.post(`/friends/requests/${requestId}/respond`, { action }, token);
      setStatus(`Friend request ${action}.`);
      loadFriends();
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-[32px] border border-white/70 p-8 shadow-panel">
        <h1 className="text-3xl font-semibold text-ink">Friends</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Log in to add friends, compare break calendars, and coordinate shared flights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-[32px] border border-white/70 p-6 shadow-panel">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Friends</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Build your travel circle</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Add friends by name, email, or college to share break schedules and plan flights together.
        </p>

        <div className="mt-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students by name, .edu email, or college"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
          />
        </div>

        {status ? <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{status}</div> : null}

        {results.length ? (
          <div className="mt-5 grid gap-3">
            {results.map((result) => (
              <div key={result.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-ink">
                    {result.first_name} {result.last_name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {result.email} • {result.college_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => sendRequest(result.id)}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Add friend
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Friends list</div>
          <div className="mt-4 space-y-3">
            {friendData.friends.length ? (
              friendData.friends.map((friend) => (
                <div key={friend.friend_id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">
                    {friend.first_name} {friend.last_name}
                  </div>
                  <div>{friend.college_name}</div>
                  <div>{friend.email}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No friends added yet.
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Incoming requests</div>
          <div className="mt-4 space-y-3">
            {friendData.incoming.length ? (
              friendData.incoming.map((request) => (
                <div key={request.id} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <div className="font-semibold">
                    {request.first_name} {request.last_name}
                  </div>
                  <div>{request.college_name}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => respond(request.id, "accepted")}
                      className="rounded-full bg-ink px-4 py-2 text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(request.id, "declined")}
                      className="rounded-full border border-slate-300 px-4 py-2"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No pending requests.
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Outgoing requests</div>
          <div className="mt-4 space-y-3">
            {friendData.outgoing.length ? (
              friendData.outgoing.map((request) => (
                <div key={request.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">
                    {request.first_name} {request.last_name}
                  </div>
                  <div>{request.college_name}</div>
                  <div className="mt-1 text-slate-500">Pending</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No outgoing requests.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
