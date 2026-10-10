/* Icons traced from the supplied sheets, served from /public/icons.
 *
 * They carry baked-in ink and pink, so they cannot inherit currentColor — on dark
 * surfaces use lucide-react instead. Names match the filenames; see the preview sheets. */

export type IconSet = 'ui' | 'objects';

export function Icon({
  name,
  set = 'ui',
  size = 24,
  style,
}: {
  name: string;
  set?: IconSet;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={`/icons/${set}/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: 'block', flex: 'none', ...style }}
    />
  );
}

/** Picks an illustrative icon for a hunt from its title. */
export function huntIconName(title?: string): string {
  const t = (title || '').toLowerCase();
  if (/coffee|brew|caf|espresso|roast/.test(t)) return 'coffee-cup';
  if (/tea|chai/.test(t)) return 'teacup';
  if (/sneaker|shoe|kick|run|sport/.test(t)) return 'sneaker';
  if (/art|gallery|museum|exhibit/.test(t)) return 'museum';
  if (/photo|camera|snap/.test(t)) return 'camera';
  if (/pizza|slice/.test(t)) return 'pizza';
  if (/food|dine|restaurant|lunch|dinner/.test(t)) return 'food-cloche';
  if (/shop|store|market|boutique|retail/.test(t)) return 'store';
  if (/park|forest|tree|garden|nature/.test(t)) return 'trees';
  if (/hike|mountain|trail|climb/.test(t)) return 'mountains';
  if (/night|bar|club/.test(t)) return 'moon';
  if (/gift|reward|prize/.test(t)) return 'gift';
  return 'pin';
}
