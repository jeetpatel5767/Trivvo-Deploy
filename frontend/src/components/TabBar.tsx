import { NavLink } from 'react-router-dom';
import { Compass, ScanLine, User } from 'lucide-react';

/** Fixed bottom tab bar. Design system section 6.3. */
const TABS = [
  { to: '/hunts', label: 'Explore', Icon: Compass },
  { to: '/scan', label: 'Scan', Icon: ScanLine },
  { to: '/profile', label: 'Profile', Icon: User },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      <div className="tabbar__inner">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <Icon strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default TabBar;
