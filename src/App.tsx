import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth.tsx';
import { Layout } from './components/Layout.tsx';
import { Login } from './pages/Login.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { PendingPlots } from './pages/PendingPlots.tsx';
import { Ledger } from './pages/Ledger.tsx';
import { Revenue } from './pages/Revenue.tsx';

/** Gate authenticated areas; bounce to /login, remembering where we came from. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Keep signed-in admins out of the auth pages. */
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pending" element={<PendingPlots />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="revenue" element={<Revenue />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
