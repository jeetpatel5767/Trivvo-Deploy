import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Floating v1 / v2 toggle, so the same screen can be compared side by side in
 * either design. Paths mirror each other, so switching keeps you in place:
 *   /hunts        <->  /v2/hunts
 *   /hunt/abc     <->  /v2/hunt/abc
 *
 * The vendor flow only exists in v1, so v2 is not offered on those routes.
 */

const V2_ONLY_PREFIX = '/v2';

function toV2(pathname: string) {
    return `${V2_ONLY_PREFIX}${pathname === '/' ? '' : pathname}`;
}

function toV1(pathname: string) {
    const stripped = pathname.slice(V2_ONLY_PREFIX.length);
    return stripped === '' ? '/' : stripped;
}

export function DesignSwitcher() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const onV2 = pathname === V2_ONLY_PREFIX || pathname.startsWith(`${V2_ONLY_PREFIX}/`);

    // The vendor area has no v2 counterpart yet — hide the toggle there so it
    // never offers a route that does not exist.
    if (!onV2 && pathname.startsWith('/vendor')) return null;

    return (
        <div className="v2-switcher" role="group" aria-label="Design version">
            <button
                className={`v2-switcher__btn${!onV2 ? ' v2-switcher__btn--on' : ''}`}
                onClick={() => onV2 && navigate(toV1(pathname), { replace: true })}
                aria-pressed={!onV2}
            >
                V1
            </button>
            <button
                className={`v2-switcher__btn${onV2 ? ' v2-switcher__btn--on' : ''}`}
                onClick={() => !onV2 && navigate(toV2(pathname), { replace: true })}
                aria-pressed={onV2}
            >
                V2
            </button>
        </div>
    );
}
