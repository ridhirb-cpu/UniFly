import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AirportSearchSelect } from "../components/AirportSearchSelect";
import { CollegeSearchSelect } from "../components/CollegeSearchSelect";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const defaultForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  collegeId: "",
  homeAirport: ""
};

export function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(() => (mode === "signup" ? "Join UniFly" : "Welcome back"), [mode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "signup"
          ? form
          : {
              email: form.email,
              password: form.password
            };

      const data = await api.post(endpoint, payload);
      if (mode === "signup") {
        setSuccess(data.message || "Check your email to verify your account");
        setMode("login");
        setForm((current) => ({
          ...defaultForm,
          email: current.email
        }));
      } else {
        login(data.token, data.user);
        navigate("/dashboard");
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[32px] bg-ink p-8 text-white shadow-panel">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sand">Verified student access</div>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">{title}</h1> 
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Sign in with your `.edu` address, set your campus, and start planning flights home around school breaks.
        </p>
        <div className="mt-8 grid gap-3">
          {[
            "Search colleges instantly with typeahead",
            "Save your home airport for faster flight suggestions",
            "Coordinate overlapping breaks with friends"
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-[32px] border border-white/70 p-6 shadow-panel sm:p-8">
        <div className="mb-6 flex gap-2 rounded-full bg-slate-100 p-1">
          {[
            "signup",
            "login"
          ].map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => setMode(nextMode)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                mode === nextMode ? "bg-white text-ink shadow" : "text-slate-500"
              }`}
            >
              {nextMode}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                placeholder="First name"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
                required
              />
              <input
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                placeholder="Last name"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
                required
              />
            </div>
          ) : null}

          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="name@school.edu"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            required
          />

          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Password"
            minLength={8}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
            required
          />

          {mode === "signup" ? (
            <AirportSearchSelect
              value={form.homeAirport}
              onChange={(value) => updateField("homeAirport", value)}
              label="Home airport"
              placeholder="Search home airport"
            />
          ) : null}

          {mode === "signup" ? (
            <CollegeSearchSelect
              value={form.collegeId}
              onChange={(value) => updateField("collegeId", value)}
              label="Verify your college"
            />
          ) : null}

          {success ? <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{success}</div> : null}
          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </div>
  );
}
