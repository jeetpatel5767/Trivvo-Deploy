import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './providers/Web3Provider';
import { MobileContainer } from './components/MobileContainer';

// Customer pages
import LoginPage from './pages/customer/LoginPage';
import HuntsPage from './pages/customer/HuntsPage';
import HuntDetailPage from './pages/customer/HuntDetailPage';
import MapPage from './pages/customer/MapPage';
import ScanPage from './pages/customer/ScanPage';
import ArrivalRewardPage from './pages/customer/ArrivalRewardPage';
import TasksPage from './pages/customer/TasksPage';
import RewardConfirmPage from './pages/customer/RewardConfirmPage';
import ProfilePage from './pages/customer/ProfilePage';

// Vendor pages
import DashboardPage from './pages/vendor/DashboardPage';
import CreateHuntPage from './pages/vendor/CreateHuntPage';
import QRCodePage from './pages/vendor/QRCodePage';
import FundHuntPage from './pages/vendor/FundHuntPage';
import HuntManagePage from './pages/vendor/HuntManagePage';
import ParticipantsPage from './pages/vendor/ParticipantsPage';
import VerifyTaskPage from './pages/vendor/VerifyTaskPage';
import AnalyticsPage from './pages/vendor/AnalyticsPage';

import SplashScreen from './pages/SplashScreen';

// Design system v2 — lives alongside v1 under /v2 so the two can be compared.
import V2Routes from './v2/V2Routes';
import { DesignSwitcher } from './v2/DesignSwitcher';

import './styles/globals.css';

// Error boundary to catch and display runtime errors instead of white screen
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#fff', background: '#1a1a2e', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ff6b6b' }}>⚠️ App Error</h1>
          <p style={{ marginTop: '16px', color: '#ccc' }}>{this.state.error?.message}</p>
          <pre style={{ marginTop: '16px', fontSize: '0.75rem', color: '#888', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '24px', padding: '12px 24px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Web3Provider>
        <BrowserRouter>
          <MobileContainer>
            <Routes>
              {/* Landing */}
              <Route path="/" element={<SplashScreen />} />

              {/* Customer routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/hunts" element={<HuntsPage />} />
              <Route path="/hunt/:id" element={<HuntDetailPage />} />
              <Route path="/map/:id" element={<MapPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/arrival-reward" element={<ArrivalRewardPage />} />
              <Route path="/tasks/:id" element={<TasksPage />} />
              <Route path="/reward-confirm" element={<RewardConfirmPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Vendor routes */}
              <Route path="/vendor/dashboard" element={<DashboardPage />} />
              <Route path="/vendor/create-hunt" element={<CreateHuntPage />} />
              <Route path="/vendor/qr/:id" element={<QRCodePage />} />
              <Route path="/vendor/fund/:id" element={<FundHuntPage />} />
              <Route path="/vendor/hunt-manage/:id" element={<HuntManagePage />} />
              <Route path="/vendor/participants/:id" element={<ParticipantsPage />} />
              <Route path="/vendor/verify-task" element={<VerifyTaskPage />} />
              <Route path="/vendor/analytics" element={<AnalyticsPage />} />

              {/* Design system v2 (customer flow) */}
              <Route path="/v2/*" element={<V2Routes />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <DesignSwitcher />
          </MobileContainer>
        </BrowserRouter>
      </Web3Provider>
    </ErrorBoundary>
  );
}

export default App;
