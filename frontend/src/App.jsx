import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { BreakPlannerPage } from "./pages/BreakPlannerPage";
import { CreateRidePage } from "./pages/CreateRidePage";
import { DashboardPage } from "./pages/DashboardPage";
import { DealsPage } from "./pages/DealsPage";
import { FriendsPage } from "./pages/FriendsPage";
import { HomePage } from "./pages/HomePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { RideBoardPage } from "./pages/RideBoardPage";
import { RidesPage } from "./pages/RidesPage";

function ProtectedRoute({ children }) {
  const { loading, token } = useAuth();

  if (loading) {
    return <div className="p-8 text-sm text-slate-600">Loading UniFly...</div>;
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/flights"
          element={
            <ProtectedRoute>
              <RideBoardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/rides" element={<RidesPage />} />
        <Route
          path="/create-ride"
          element={
            <ProtectedRoute>
              <CreateRidePage />
            </ProtectedRoute>
          }
        />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/break-planner" element={<BreakPlannerPage />} />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}
