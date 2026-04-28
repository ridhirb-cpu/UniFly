import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function DealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    const query = user?.college_id ? `?collegeId=${user.college_id}` : "";
    api.get(`/deals${query}`).then(setDeals).catch(() => setDeals([]));
  }, [user]);

  return (
    <div className="space-y-6">
      <section className="glass rounded-[32px] border border-white/70 p-6 shadow-panel">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Travel Deals</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Expiring student travel deals</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Deals are sorted by expiration date and can be targeted to specific campuses or shown platform-wide.
        </p>
      </section>

      <section className="grid gap-5">
        {deals.map((deal) => (
          <article key={deal.id} className="glass rounded-[28px] border border-white/70 p-6 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">{deal.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{deal.description}</p>
              </div>
              <div className="rounded-full bg-sand/60 px-4 py-2 text-sm font-semibold text-amber-900">
                Expires {new Date(deal.expiration_date).toLocaleDateString()}
              </div>
            </div>
            <a
              href={deal.link}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              View deal
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
