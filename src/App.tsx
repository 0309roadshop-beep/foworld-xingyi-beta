import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { usePlayer } from './context/PlayerContext'
import CameraPage from './pages/CameraPage'
import StickerCameraPage from './pages/StickerCameraPage'
import CompassPage from './pages/CompassPage'
import ExchangePage from './pages/ExchangePage'
import LandingPage from './pages/LandingPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import Day1Page from './pages/Day1Page'
import RiverRunPage from './pages/RiverRunPage'
import ArtifactScanPage from './pages/ArtifactScanPage'
import ZhongXingARPage from './pages/ZhongXingARPage'
import RiYueTracingPage from './pages/RiYueTracingPage'
import BaGuaPuzzlePage from './pages/BaGuaPuzzlePage'
import CompassAnomalyPage from './pages/CompassAnomalyPage'
import WindRidingPage from './pages/WindRidingPage'
import LeylineMatch3Page from './pages/LeylineMatch3Page'
import WindBalancePage from './pages/WindBalancePage'
import CloudLeapPage from './pages/CloudLeapPage'
import RedDustScannerPage from './pages/RedDustScannerPage'
import TaskDetailPage from './pages/TaskDetailPage'
import CollectionPage from './pages/CollectionPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isActivated } = usePlayer()
  if (!isActivated) {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/compass"
          element={
            <ProtectedRoute>
              <CompassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exchange"
          element={
            <ProtectedRoute>
              <ExchangePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collection"
          element={
            <ProtectedRoute>
              <CollectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/camera"
          element={
            <ProtectedRoute>
              <CameraPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sticker-camera"
          element={
            <ProtectedRoute>
              <StickerCameraPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/day1"
          element={
            <ProtectedRoute>
              <Day1Page />
            </ProtectedRoute>
          }
        />
        <Route
          path="/river-run"
          element={
            <ProtectedRoute>
              <RiverRunPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/artifact-scan"
          element={
            <ProtectedRoute>
              <ArtifactScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/zhongxing-ar"
          element={
            <ProtectedRoute>
              <ZhongXingARPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/riyue-tracing"
          element={
            <ProtectedRoute>
              <RiYueTracingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bagua-puzzle"
          element={
            <ProtectedRoute>
              <BaGuaPuzzlePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compass-anomaly"
          element={
            <ProtectedRoute>
              <CompassAnomalyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wind-riding"
          element={
            <ProtectedRoute>
              <WindRidingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leyline-match3"
          element={
            <ProtectedRoute>
              <LeylineMatch3Page />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wind-balance"
          element={
            <ProtectedRoute>
              <WindBalancePage />
            </ProtectedRoute>
          }
        />
        {/* 免登录真机试玩 — 手机扫码直达，无需先注册 */}
        <Route path="/test/wind-balance" element={<WindBalancePage testMode />} />
        <Route path="/test/red-dust-scanner" element={<RedDustScannerPage testMode />} />
        <Route
          path="/cloud-leap"
          element={
            <ProtectedRoute>
              <CloudLeapPage />
            </ProtectedRoute>
          }
        />
        <Route path="/test/cloud-leap" element={<CloudLeapPage testMode />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return <AppRoutes />
}

export default App
