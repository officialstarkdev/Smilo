import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Book from './pages/Book.jsx';
import Booked from './pages/Booked.jsx';
import Manage from './pages/Manage.jsx';
import StaffLogin from './pages/StaffLogin.jsx';
import Admin from './pages/Admin.jsx';
import { useAuth } from './context/AuthContext.jsx';

/** Scroll to #hash targets after navigation, otherwise to the top. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section has rendered
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);
  return null;
}

function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Opening the schedule…</div>;
  if (!user) return <Navigate to="/staff/login" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollManager />
      <Header />
      <main id="main" className="page" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="/booked/:token" element={<Booked />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="/manage/:token" element={<Manage />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route
            path="/staff"
            element={
              <StaffRoute>
                <Admin />
              </StaffRoute>
            }
          />
          {/* old barbershop paths */}
          <Route path="/booking" element={<Navigate to="/book" replace />} />
          <Route path="/admin" element={<Navigate to="/staff" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
