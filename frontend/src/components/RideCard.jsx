import { Calendar, MapPin, PlaneTakeoff, Users } from "lucide-react";

export function RideCard({ ride, onJoin, membershipLabel = "", disableJoin = false, secondaryActionLabel = "", onSecondaryAction }) {
  return (
    <article className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sea">
            {ride.college_name}
          </div>
          <h3 className="mt-2 text-xl font-semibold text-ink">Airport ride to {ride.departure_airport}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {membershipLabel ? (
            <div className="rounded-full bg-sky/10 px-3 py-1 text-xs font-medium text-sky-900">
              {membershipLabel}
            </div>
          ) : null}
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {ride.first_name} {ride.last_name}
          </div>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-sky" />
          <span>{new Date(ride.departure_datetime).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <PlaneTakeoff size={16} className="text-sky" />
          <span>{ride.departure_airport}</span>
        </div>
        <div className="flex items-center gap-3">
          <Users size={16} className="text-sky" />
          <span>
            {ride.passenger_count}/{ride.seats_available} seats filled
          </span>
        </div>
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-sky" />
          <span>{ride.meeting_location}</span>
        </div>
      </div>

      {ride.cost_split ? (
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Cost split: {ride.cost_split}
        </div>
      ) : null}

      {ride.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{ride.notes}</p> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {onJoin ? (
          <button
            type="button"
            disabled={disableJoin}
            onClick={() => onJoin(ride)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {disableJoin ? "Already joined" : "Join ride"}
          </button>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <button
            type="button"
            onClick={() => onSecondaryAction(ride)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
