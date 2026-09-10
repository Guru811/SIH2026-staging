import ErrorBoundary from './components/ErrorBoundary'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import MobileTabbar from './components/MobileTabbar'
import Overview from './pages/Overview'
import RiskMap from './pages/RiskMap'
import Projects from './pages/Projects'
import Vendors from './pages/Vendors'
import MPs from './pages/MPs'
import Duplicates from './pages/Duplicates'
import Explore from './pages/Explore'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      <div className="md:pl-20 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
        <AnimatePresence mode="wait">
          <ErrorBoundary key={location.pathname}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Overview />} />
              <Route path="/risk-map" element={<RiskMap />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/mps" element={<MPs />} />
              <Route path="/duplicates" element={<Duplicates />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </ErrorBoundary>
        </AnimatePresence>
        </AnimatePresence>
      </div>
      <MobileTabbar />
    </div>
  )
}
