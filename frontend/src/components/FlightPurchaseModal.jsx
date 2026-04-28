import { useEffect } from "react";
import airports from "../data/airports.json";

const citySuggestions = {
  chicago: {
    hotels: ["The Hoxton Chicago", "Sable at Navy Pier", "citizenM Chicago Downtown"],
    food: ["Au Cheval", "Girl & The Goat", "Lou Malnati's"],
    entertainment: ["Architecture River Cruise", "Art Institute of Chicago", "Second City" ]
  },
  atlanta: {
    hotels: ["The Candler Hotel", "Hotel Clermont", "Hyatt Centric Midtown"],
    food: ["The Optimist", "Fox Bros. Bar-B-Q", "Ponce City Market"],
    entertainment: ["Georgia Aquarium", "BeltLine walk", "High Museum of Art"]
  },
  austin: {
    hotels: ["Hotel Van Zandt", "South Congress Hotel", "The Carpenter Hotel"],
    food: ["Franklin Barbecue", "Veracruz All Natural", "Uchi"],
    entertainment: ["Live music on Rainey Street", "Lady Bird Lake trail", "Barton Springs"]
  },
  default: {
    hotels: ["Downtown boutique hotel", "Airport shuttle hotel", "Budget-friendly student stay"],
    food: ["Local brunch spot", "Late-night eats near downtown", "Popular student-friendly cafe"],
    entertainment: ["Walkable downtown district", "Local museum or gallery", "Live music or comedy venue"]
  }
};

export function FlightPurchaseModal({ flight, onClose }) {
  const safeFlight = flight || null;
  const airport = safeFlight ? airports.find((item) => item.code === safeFlight.arrival_airport) : null;
  const cityKey = airport?.city?.toLowerCase() || "default";
  const suggestions = citySuggestions[cityKey] || citySuggestions.default;
  const stops = safeFlight?.stops ?? 0;
  const layover = safeFlight?.layover_airport ? `${safeFlight.layover_airport}${safeFlight.layover_duration ? ` • ${safeFlight.layover_duration}` : ""}` : "Nonstop";
  const duration = safeFlight?.duration || "Estimated at checkout";
  const googleFlightsUrl = safeFlight
    ? `https://www.google.com/travel/flights?q=Flights%20from%20${safeFlight.departure_airport}%20to%20${safeFlight.arrival_airport}%20on%20${safeFlight.depart_date}%20return%20${safeFlight.return_date}`
    : "#";
  const bagPolicy = safeFlight?.bag_policy || "Carry-on details shown by carrier";
  const seatType = safeFlight?.seat_type || "Seat details shown by carrier";

  useEffect(() => {
    if (!safeFlight) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, safeFlight]);

  if (!safeFlight) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass my-auto w-full max-w-4xl rounded-[32px] border border-white/70 p-6 shadow-panel sm:max-h-[90vh] sm:overflow-y-auto sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Flight Details</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              {flight.airline} {flight.flight_number}
            </h2>
            <div className="mt-2 text-sm text-slate-600">
              {flight.departure_airport} -&gt; {flight.arrival_airport} • {flight.travel_class}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Trip snapshot</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                <div>
                  <div className="font-semibold text-ink">Departure</div>
                  <div>{new Date(flight.depart_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Return</div>
                  <div>{new Date(flight.return_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Duration</div>
                  <div>{duration}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Stops</div>
                  <div>{stops === 0 ? "Nonstop" : `${stops} stop${stops === 1 ? "" : "s"}`}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="font-semibold text-ink">Layover</div>
                  <div>{layover}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Bags</div>
                  <div>{bagPolicy}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Seat details</div>
                  <div>{seatType}</div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-2xl font-semibold text-ink">${safeFlight.price}</div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={googleFlightsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Open Google Flights
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Where to stay</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {suggestions.hotels.map((item) => (
                  <div key={item} className="rounded-2xl bg-white px-3 py-3">{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Food picks</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {suggestions.food.map((item) => (
                  <div key={item} className="rounded-2xl bg-white px-3 py-3">{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">Things to do</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {suggestions.entertainment.map((item) => (
                  <div key={item} className="rounded-2xl bg-white px-3 py-3">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
