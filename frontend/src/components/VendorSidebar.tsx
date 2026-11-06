import { NavLink } from 'react-router-dom';
import { LayoutGrid, PlusCircle, BarChart3 } from 'lucide-react';

/** Vendor navigation. Same fixed tab bar shell as the customer side (section 6.3). */
const ITEMS = [
  { to: '/vendor/dashboard', label: 'Overview', Icon: LayoutGrid },
  { to: '/vendor/create-hunt', label: 'New hunt', Icon: PlusCircle },
  { to: '/vendor/analytics', label: 'Analytics', Icon: BarChart3 },
];

export function VendorSidebar() {
  return (
    <nav className="tabbar">
      <div className="tabbar__inner">
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <Icon strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
