import { Icon } from '../../components/Icon';
import { VendorHuntCard } from '../../components/VendorHuntCard';
import { businessName, storeBusinessName } from '../../lib/displayName';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, Pencil } from 'lucide-react';
import { login, getMyHunts, getMyVendor, saveBusinessName } from '../../lib/api';
import { useDemoAccount } from '../../lib/demoAccount';
import { totalReward, type Hunt } from '../../lib/types';
import { VendorSidebar } from '../../components/VendorSidebar';
import {
  AppBar,
  Button,
  CardSkeleton,
  EmptyState,
  IconStrip,
  Money,
  Panel,
  SectionLabel,
  Input,
  Sheet,
  Toast,
  useToast,
} from '../../ui';

/** Vendor overview — ink hero (business, not consumer), flush hunt list below. */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { isConnected, address } = useDemoAccount();
  const toast = useToast();
  const [shop, setShop] = useState(() => businessName());
  const [editingShop, setEditingShop] = useState(false);
  const [shopDraft, setShopDraft] = useState('');
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    // Register the vendor, then sync the business name both ways: the server copy is what
    // hunters see, so adopt it here; if only this browser has a name, send it up.
    login(address, 'vendor', businessName() || undefined)
      .then(() => getMyVendor())
      .then((res) => {
        const saved = res.data.businessName as string | null;
        if (saved) {
          storeBusinessName(saved);
          setShop(saved);
        } else if (businessName()) {
          void saveBusinessName(businessName());
        }
      })
      .catch(() => {});
    getMyHunts()
      .then((res) => setHunts(res.data.hunts || []))
      .catch(() => setHunts([]))
      .finally(() => setLoading(false));
  }, [isConnected, address]);

  /** Save the name to the server so hunters see it; keep a local copy so it shows instantly next time. */
  const saveShop = async () => {
    const name = shopDraft.trim();
    if (!name) {
      toast.show('Enter your business name.');
      return;
    }
    try {
      await saveBusinessName(name);
      storeBusinessName(name);
      setShop(name);
      setEditingShop(false);
      toast.show('Business name updated');
    } catch {
      toast.show('That did not save. Try again.');
    }
  };

  const staked = useMemo(() => hunts.reduce((s, h) => s + totalReward(h), 0), [hunts]);
  const live = useMemo(() => hunts.filter((h) => h.status === 'active').length, [hunts]);

  return (
    <>
      <div className="screen screen--tabbar">
        {/* Dark hero — the business side reads differently from the consumer side */}
        <div className="hero hero--ink hero--tall" style={{ paddingTop: 0 }}>
          <AppBar
            tone="dark"
            action={
              <button
                type="button"
                onClick={() => {
                  setShopDraft(shop);
                  setEditingShop(true);
                }}
                className="row truncate"
                style={{
                  gap: 8,
                  maxWidth: 210,
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 999,
                  background: 'rgba(244,241,234,0.12)',
                  color: 'var(--bone)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span className="truncate">{shop || 'Add your business name'}</span>
                <Pencil size={13} strokeWidth={2.4} style={{ flex: 'none', opacity: 0.7 }} />
              </button>
            }
          />

          <span className="overline" style={{ color: 'rgba(244,241,234,0.62)' }}>
            Staked across your hunts
          </span>

          <div style={{ marginTop: 12 }}>
            <Money value={staked} size="hero" chip />
          </div>

          <p className="body-sm" style={{ marginTop: 14, color: 'rgba(244,241,234,0.62)' }}>
            {live} {live === 1 ? 'hunt' : 'hunts'} live right now
          </p>
        </div>

        <Panel style={{ marginTop: -16, position: 'relative' }}>
          <IconStrip
            items={[
              { icon: <Icon name="flag" set="objects" size={22} />, label: 'New hunt', onClick: () => navigate('/vendor/create-hunt') },
              { icon: <CheckCircle2 strokeWidth={2.2} />, label: 'Verify', onClick: () => navigate('/vendor/verify-task') },
              { icon: <Icon name="bar-chart" set="objects" size={22} />, label: 'Analytics', onClick: () => navigate('/vendor/analytics') },
            ]}
          />
        </Panel>

        <section style={{ marginTop: 32 }}>
          <SectionLabel>Your hunts</SectionLabel>

          <div className="stack pad">
            {loading ? (
              <>
                <CardSkeleton h={140} />
                <CardSkeleton h={140} />
              </>
            ) : hunts.length === 0 ? (
              <EmptyState
                icon={<Icon name="flag" set="objects" size={26} />}
                title="No hunts yet"
                body="Create your first hunt and stake a reward to get people walking in."
              />
            ) : (
              hunts.map((hunt) => <VendorHuntCard key={hunt.hunt_id} hunt={hunt} />)
            )}
          </div>
        </section>

        <div className="pad" style={{ marginTop: 32 }}>
          <Button variant="primary" size="lg" block onClick={() => navigate('/vendor/create-hunt')}>
            <Plus size={18} strokeWidth={2.6} />
            Create hunt
          </Button>
        </div>
      </div>
      <Sheet open={editingShop} onClose={() => setEditingShop(false)}>
        <span className="overline t-subtle">Your business name</span>
        <div style={{ marginTop: 14 }}>
          <Input
            value={shopDraft}
            onChange={(e) => setShopDraft(e.target.value)}
            placeholder="Brew Lab Café"
            maxLength={60}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveShop();
            }}
          />
          <p className="caption t-subtle" style={{ marginTop: 10 }}>
            Shown to hunters on all of your hunts.
          </p>
        </div>
        <div style={{ marginTop: 20 }}>
          <Button variant="ink" size="lg" block onClick={() => void saveShop()}>
            Save
          </Button>
        </div>
      </Sheet>

      <Toast message={toast.message} onDone={toast.clear} />
      <VendorSidebar />
    </>
  );
}
