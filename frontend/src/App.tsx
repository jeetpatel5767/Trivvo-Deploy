import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './providers/Web3Provider';
import { MobileContainer } from './components/MobileContainer';
import { RequireWallet } from './components/RequireWallet';

// Customer pages
import LoginPage from './pages/customer/LoginPage';
import HuntsPage from './pages/customer/HuntsPage';
import HuntDetailPage from './pages/customer/HuntDetailPage';
import MapPage from './pages/customer/MapPage';
import ScanPage from './pages/customer/ScanPage';
import HuntEntryPage from './pages/customer/HuntEntryPage';
import ReceiptPage from './pages/customer/ReceiptPage';
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
import ReviewQueuePage from './pages/vendor/ReviewQueuePage';
import AnalyticsPage from './pages/vendor/AnalyticsPage';

import SplashScreen from './pages/SplashScreen';
import './styles/tokens.css';
import './styles/ui.css';

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
        <div className="frame">
          <div className="screen">
            <div className="stack" style={{ paddingTop: 48 }}>
              <span className="overline t-subtle">Something broke</span>
              <h1 className="title-l">That screen did not load.</h1>
              <p className="body t-muted">{this.state.error?.message}</p>
              <button className="btn btn--primary btn--lg btn--block" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
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
              {/* C1: QR target — any phone camera opens /h/:id?k=<secret> */}
              <Route path="/h/:id" element={<HuntEntryPage />} />
              {/* F3/G1: public receipt + trust timeline (no login) */}
              <Route path="/receipt/:huntId" element={<ReceiptPage />} />
              <Route path="/map/:id" element={<MapPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/arrival-reward" element={<ArrivalRewardPage />} />
              <Route path="/tasks/:id" element={<TasksPage />} />
              <Route path="/reward-confirm" element={<RewardConfirmPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Vendor routes */}
              {/* Business screens: RequireWallet asks for the wallet first instead of opening empty */}
              <Route path="/vendor/dashboard" element={<RequireWallet><DashboardPage /></RequireWallet>} />
              <Route path="/vendor/create-hunt" element={<RequireWallet><CreateHuntPage /></RequireWallet>} />
              <Route path="/vendor/qr/:id" element={<RequireWallet><QRCodePage /></RequireWallet>} />
              <Route path="/vendor/fund/:id" element={<RequireWallet><FundHuntPage /></RequireWallet>} />
              <Route path="/vendor/hunt-manage/:id" element={<RequireWallet><HuntManagePage /></RequireWallet>} />
              <Route path="/vendor/participants/:id" element={<RequireWallet><ParticipantsPage /></RequireWallet>} />
              <Route path="/vendor/verify-task" element={<RequireWallet><VerifyTaskPage /></RequireWallet>} />
              {/* E2: per-hunt review queue */}
              <Route path="/vendor/reviews/:id" element={<RequireWallet><ReviewQueuePage /></RequireWallet>} />
              <Route path="/vendor/analytics" element={<RequireWallet><AnalyticsPage /></RequireWallet>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </MobileContainer>
        </BrowserRouter>
      </Web3Provider>
    </ErrorBoundary>
  );
}

export default App;
