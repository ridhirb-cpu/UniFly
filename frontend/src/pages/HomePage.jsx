import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Plane, Ticket, Users } from "lucide-react";

const features = [
  {
    title: "Pick your campus",
    description: "Search 1000+ colleges, load the right break calendar, and use the nearest airport automatically."
  },
  {
    title: "Find break-based flights",
    description: "Turn school breaks into suggested flights using your campus airport, home airport, and break dates."
  },
  {
    title: "Coordinate with friends",
    description: "Spot overlapping breaks, plan the same departure dates, and add an airport ride only if you need one."
  }
];

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-[36px] bg-ink px-6 py-10 text-white shadow-panel sm:px-10 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
              UniFly for college break travel
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              Plan flights home around your college breaks.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              UniFly helps students line up flights around academic calendars, coordinate with friends on overlapping breaks, and keep airport rides as a secondary add-on.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Start with your college
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/flights"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore flights
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[30px] bg-white/10 p-4 backdrop-blur">
            <div className="rounded-[28px] bg-white p-5 text-ink">
              <div className="text-sm font-semibold text-sea">Upcoming flight ideas</div>
              <div className="mt-4 grid gap-3">
                {[
                  "Thanksgiving: AUS -> JFK",
                  "Winter Break: DTW -> LAX",
                  "Spring Break: RDU -> ATL",
                  "Friends overlap: same departure dates"
                ].map((route) => (
                  <div key={route} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    {route}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] bg-white/15 p-5">
                <CalendarDays className="text-sand" size={22} />
                <div className="mt-4 text-2xl font-semibold">School break aware</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Turn Thanksgiving, winter, spring, and fall breaks into flight searches fast.
                </p>
              </div>
              <div className="rounded-[28px] bg-white/15 p-5">
                <Ticket className="text-sand" size={22} />
                <div className="mt-4 text-2xl font-semibold">Deals feed</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Surface expiring travel discounts relevant to a student&apos;s campus and timing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {features.map((feature, index) => {
          const icons = [CalendarDays, Plane, Users];
          const Icon = icons[index];

          return (
            <article key={feature.title} className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
              <div className="inline-flex rounded-2xl bg-slate-100 p-3">
                <Icon className="text-sky" size={22} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-ink">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
