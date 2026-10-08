import { Routes, Route, Navigate } from 'react-router-dom';
import V2Splash from './pages/SplashScreen';
import V2Login from './pages/LoginPage';
import V2Hunts from './pages/HuntsPage';
import V2HuntDetail from './pages/HuntDetailPage';
import V2Map from './pages/MapPage';
import V2Scan from './pages/ScanPage';
import V2ArrivalReward from './pages/ArrivalRewardPage';
import V2Tasks from './pages/TasksPage';
import V2Profile from './pages/ProfilePage';
import './styles/v2.css';

/**
 * v2 design system route tree, mounted under /v2.
 *
 * Paths mirror v1 one-for-one so the design switcher can translate between
 * the two versions of the same screen. The vendor flow is not redesigned yet
 * and still lives in v1.
 */
export default function V2Routes() {
    return (
        <div className="v2">
            <Routes>
                <Route index element={<V2Splash />} />
                <Route path="login" element={<V2Login />} />
                <Route path="hunts" element={<V2Hunts />} />
                <Route path="hunt/:id" element={<V2HuntDetail />} />
                <Route path="map/:id" element={<V2Map />} />
                <Route path="scan" element={<V2Scan />} />
                <Route path="arrival-reward" element={<V2ArrivalReward />} />
                <Route path="tasks/:id" element={<V2Tasks />} />
                <Route path="profile" element={<V2Profile />} />
                <Route path="*" element={<Navigate to="/v2/hunts" replace />} />
            </Routes>
        </div>
    );
}
