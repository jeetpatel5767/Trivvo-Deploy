import React from 'react';
import { useLocation } from 'react-router-dom';

/** Dark surfaces are allowed on the map and scan screens only (design system section 10). */
const DARK_ROUTES = ['/map', '/scan'];
/** The splash is its own dark surface. */
const DARK_EXACT = ['/'];

export function MobileContainer({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const dark = DARK_ROUTES.some((r) => pathname.startsWith(r)) || DARK_EXACT.includes(pathname);

  React.useEffect(() => {
    const colour = dark ? '#10231C' : '#F4F1EA';
    document.body.style.background = colour;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
  }, [dark]);

  return <div className={dark ? 'frame frame--dark' : 'frame'}>{children}</div>;
}
