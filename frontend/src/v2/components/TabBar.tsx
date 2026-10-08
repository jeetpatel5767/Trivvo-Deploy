import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, Scan, User } from './Icons';

const TABS = [
    { to: '/v2/hunts', label: 'Explore', Icon: Compass },
    { to: '/v2/scan', label: 'Scan', Icon: Scan },
    { to: '/v2/profile', label: 'Profile', Icon: User },
];

export function TabBar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <nav className="v2-tabbar">
            <div className="v2-tabbar__inner">
                {TABS.map(({ to, label, Icon }) => {
                    const on = pathname === to || pathname.startsWith(`${to}/`);
                    return (
                        <button
                            key={to}
                            className={`v2-tab${on ? ' v2-tab--on' : ''}`}
                            onClick={() => navigate(to)}
                            aria-current={on ? 'page' : undefined}
                        >
                            <Icon />
                            {label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
