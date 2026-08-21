import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AppLayout from './components/layout/AppLayout';
import OnboardingModal from './components/OnboardingModal';
import { ToastViewport } from './components/ui/Toast';
import useProgressStore from './store/progressStore';
import useUserStore from './store/userStore';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AICompanion from './pages/AICompanion';
import RoleplaySelector from './pages/RoleplaySelector';
import RoleplaySession from './pages/RoleplaySession';
import Progress from './pages/Progress';
import ConfidenceJourney from './pages/ConfidenceJourney';
import ConfidenceGarden from './pages/ConfidenceGarden';
import SpeechFeedback from './pages/SpeechFeedback';
import FindSaathi from './pages/FindSaathi';
import PeerChat from './pages/PeerChat';
import Community from './pages/Community';
import Journal from './pages/Journal';
import Safety from './pages/Safety';
import Challenges from './pages/Challenges';
import NotFound from './pages/NotFound';

/**
 * ProtectedRoute — ensures user is authenticated before viewing app screens.
 */
function ProtectedRoute({ children }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * AnimatedRoutes — wraps route changes in a smooth crossfade transition.
 */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companion" element={<AICompanion />} />
          <Route path="/sara" element={<AICompanion />} />
          <Route path="/practice" element={<RoleplaySelector />} />
          <Route path="/roleplay/:scenarioId" element={<RoleplaySession />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/journey" element={<ConfidenceJourney />} />
          <Route path="/garden" element={<ConfidenceGarden />} />
          <Route path="/speech" element={<SpeechFeedback />} />
          <Route path="/peer" element={<FindSaathi />} />
          <Route path="/peer/chat/:saathiId" element={<PeerChat />} />
          <Route path="/community" element={<Community />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function ProgressBoot() {
  const fetchAll = useProgressStore((s) => s.fetchAll);
  const userId = useUserStore((s) => s.userId);

  useEffect(() => {
    if (userId) fetchAll(true);
  }, [userId]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ProgressBoot />
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/*" element={<AnimatedRoutes />} />
        </Route>
      </Routes>
      <ToastViewport />
    </BrowserRouter>
  );
}