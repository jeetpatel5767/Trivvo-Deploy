import { Icon } from '../../components/Icon';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Sparkles, ShieldCheck } from 'lucide-react';
import { createHunt, login, previewRubrics, saveBusinessName, OFFLINE } from '../../lib/api';
import { useDemoAccount } from '../../lib/demoAccount';
import { businessName, storeBusinessName } from '../../lib/displayName';
import {
  AppBar,
  Block,
  Button,
  Field,
  Input,
  Money,
  Panel,
  SectionLabel,
  Textarea,
  Toast,
  UnitInput,
  useToast,
} from '../../ui';
import { formatWindow, useNow } from '../../lib/time';

/** Same rules the fund step enforces, so a bad window is caught here instead of after the form. */
const OPEN_DELAY_MS = 30_000; // a funded hunt opens about 30s after Fund is pressed (contract needs a future start)
const MIN_RUN_MS = 10 * 60_000;
const DEFAULT_RUN_MS = 30 * 86_400_000;

/* placeholder: prefilled while OFFLINE so the form can be submitted without typing. */
const PREFILL = OFFLINE
  ? {
      title: 'Coffee quest at Brew Lab',
      description: 'Visit us and find the hidden menu board behind the counter.',
      locationName: 'Brew Lab, Downtown',
      locationLat: '40.7128',
      locationLng: '-74.0060',
      startTime: '',
      endTime: '',
      arrivalReward: '0.5',
      mainReward: '5',
      tasks: ['Find the hidden menu board', 'Order a special item'],
    }
  : {
      title: '',
      description: '',
      locationName: '',
      locationLat: '',
      locationLng: '',
      startTime: '',
      endTime: '',
      arrivalReward: '0.5',
      mainReward: '5',
      tasks: [''],
    };

/** Create hunt — grouped flush panels, pink summary, one primary. */
export default function CreateHuntPage() {
  const navigate = useNavigate();
  const { address } = useDemoAccount();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(PREFILL);
  const [biz, setBiz] = useState(() => businessName());
  const now = useNow(30_000);

  // What the schedule will really be: a blank start means "as soon as it's funded", a blank end means 30 days.
  const startMs = form.startTime ? new Date(form.startTime).getTime() : now + OPEN_DELAY_MS;
  const endMs = form.endTime ? new Date(form.endTime).getTime() : now + DEFAULT_RUN_MS;
  const validTimes = Number.isFinite(startMs) && Number.isFinite(endMs);
  const opensMs = Math.max(startMs, now + OPEN_DELAY_MS);
  const windowText = validTimes ? formatWindow(new Date(opensMs).toISOString(), new Date(endMs).toISOString()) : null;
  const windowTooShort = validTimes && endMs - opensMs < MIN_RUN_MS;

  // D1: 0G-written photo rubric per task. null until the vendor generates them.
  type Rubric = { title: string; rubric: string; rubricRequestId: string | null; rubricByAi: boolean };
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [rubricLoading, setRubricLoading] = useState(false);

  const set = (field: string, value: string) => setForm({ ...form, [field]: value });
  const addTask = () => { setForm({ ...form, tasks: [...form.tasks, ''] }); setRubrics(null); };
  const setTask = (i: number, v: string) => {
    setForm({ ...form, tasks: form.tasks.map((t, idx) => (idx === i ? v : t)) });
    setRubrics(null); // titles changed — rubrics are stale
  };
  const rmTask = (i: number) => { setForm({ ...form, tasks: form.tasks.filter((_, idx) => idx !== i) }); setRubrics(null); };

  const generateRubrics = async () => {
    const titles = form.tasks.map((t) => t.trim()).filter(Boolean);
    if (titles.length === 0) return;
    setRubricLoading(true);
    try {
      await login(address!, 'vendor', biz.trim() || undefined);
      const res = await previewRubrics(titles);
      setRubrics(res.data.tasks);
    } catch {
      toast.show('Could not generate photo checks. You can still create the hunt.');
    } finally {
      setRubricLoading(false);
    }
  };

  const setRubric = (i: number, v: string) =>
    setRubrics((prev) => (prev ?? []).map((r, idx) => (idx === i ? { ...r, rubric: v, rubricByAi: false } : r)));

  const total = (parseFloat(form.arrivalReward) || 0) + (parseFloat(form.mainReward) || 0);

  const submit = async () => {
    const name = biz.trim();
    if (!name) {
      toast.show('Add your business name. Hunters see it on the hunt.');
      return;
    }
    if (!validTimes) {
      toast.show('Check the start and end times.');
      return;
    }
    if (windowTooShort) {
      toast.show('The hunt must stay open at least 10 minutes after it opens. Pick a later end time.');
      return;
    }
    setLoading(true);
    try {
      // Save the name first, so every hunt of yours shows it to hunters (not a placeholder).
      await login(address!, 'vendor', name);
      await saveBusinessName(name);
      storeBusinessName(name);
      const res = await createHunt({
        vendorWallet: address,
        title: form.title,
        description: form.description,
        locationLat: parseFloat(form.locationLat) || 40.7128,
        locationLng: parseFloat(form.locationLng) || -74.006,
        locationName: form.locationName,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : new Date().toISOString(),
        endTime: form.endTime
          ? new Date(form.endTime).toISOString()
          : new Date(Date.now() + 30 * 86_400_000).toISOString(),
        arrivalReward: parseFloat(form.arrivalReward),
        mainReward: parseFloat(form.mainReward),
        // D1: send the rubric objects if generated/edited, else plain titles (server will write rubrics).
        tasks: rubrics ?? form.tasks.filter(Boolean),
      });
      navigate(`/vendor/qr/${res.data.hunt.hunt_id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.show(msg || 'That did not save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="screen">
        <div className="hero hero--soft" style={{ paddingTop: 0 }}>
          <AppBar onBack={() => navigate('/vendor/dashboard')} tone="pink" />
          <span className="overline t-subtle">New hunt</span>
          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 8 }}>
            Set it up.
          </h1>
        </div>

        <section style={{ marginTop: 24 }}>
          <SectionLabel>The basics</SectionLabel>
          <Panel>
            <Block>
              <Field label="Business name" hint="Hunters see this on your hunt.">
                <Input value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Your shop or brand" maxLength={60} />
              </Field>
            </Block>
            <Block>
              <Field label="Title">
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Coffee quest" />
              </Field>
            </Block>
            <Block>
              <Field label="Description" hint="What will the hunter actually do?">
                <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
            </Block>
          </Panel>
        </section>

        <section style={{ marginTop: 28 }}>
          <SectionLabel icon={<Icon name="pin" set="objects" size={16} />}>Where</SectionLabel>
          <Panel>
            <Block>
              <Field label="Place name">
                <Input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} />
              </Field>
            </Block>
            <Block>
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="grow">
                  <Field label="Latitude">
                    <Input inputMode="decimal" value={form.locationLat} onChange={(e) => set('locationLat', e.target.value)} />
                  </Field>
                </div>
                <div className="grow">
                  <Field label="Longitude">
                    <Input inputMode="decimal" value={form.locationLng} onChange={(e) => set('locationLng', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Block>
          </Panel>
        </section>

        <section style={{ marginTop: 28 }}>
          <SectionLabel icon={<Icon name="calendar" set="objects" size={16} />}>When</SectionLabel>
          <Panel>
            <Block>
              <Field label="Starts" hint="Leave empty to start now.">
                <Input type="datetime-local" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </Field>
            </Block>
            <Block>
              <Field label="Ends" hint="Leave empty for 30 days.">
                <Input type="datetime-local" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </Field>
            </Block>
            {windowText && (
              <Block tight>
                <span className="overline t-subtle">It will run</span>
                <p className="body-sm" style={{ marginTop: 6, fontWeight: 600 }}>{windowText}</p>
                <p className="caption t-subtle" style={{ marginTop: 6 }}>
                  A funded hunt opens about 30 seconds after you press Fund, because the contract needs a start time in the future.
                </p>
                {windowTooShort && (
                  <p className="caption" style={{ marginTop: 8, color: 'var(--error)' }}>
                    It would close less than 10 minutes after it opens. Pick a later end time.
                  </p>
                )}
              </Block>
            )}
          </Panel>
        </section>

        <section style={{ marginTop: 28 }}>
          <SectionLabel icon={<Icon name="flag" set="objects" size={16} />}>Tasks</SectionLabel>
          <Panel>
            {form.tasks.map((task, i) => (
              <Block key={i} tight>
                <div className="row" style={{ gap: 10 }}>
                  <div className="grow">
                    <Input value={task} placeholder={`Task ${i + 1}`} onChange={(e) => setTask(i, e.target.value)} />
                  </div>
                  {form.tasks.length > 1 && (
                    <button type="button" className="icon-btn" onClick={() => rmTask(i)} aria-label="Remove task">
                      <X />
                    </button>
                  )}
                </div>
              </Block>
            ))}
            <Block tight>
              <Button variant="secondary" size="sm" onClick={addTask}>
                <Plus size={16} strokeWidth={2.6} />
                Add task
              </Button>
            </Block>
          </Panel>
        </section>

        {/* D1: 0G writes a photo check (rubric) per task. The vendor can edit each one. */}
        <section style={{ marginTop: 28 }}>
          <SectionLabel icon={<Sparkles size={15} strokeWidth={2.4} />}>Photo checks (0G)</SectionLabel>
          <Panel>
            {!rubrics ? (
              <Block>
                <p className="body-sm t-muted">
                  0G writes a short &quot;what the photo must show&quot; for each task. Hunters&apos; photos are judged against it.
                </p>
                <div style={{ marginTop: 12 }}>
                  <Button
                    variant="ink"
                    size="md"
                    loading={rubricLoading}
                    disabled={form.tasks.filter((t) => t.trim()).length === 0}
                    onClick={generateRubrics}
                  >
                    <Sparkles size={15} strokeWidth={2.4} /> Generate photo checks
                  </Button>
                </div>
              </Block>
            ) : (
              <>
                {rubrics.map((r, i) => (
                  <Block key={i} tight>
                    <div className="row-between">
                      <span className="caption t-subtle" style={{ fontWeight: 700 }}>{r.title || `Task ${i + 1}`}</span>
                      {r.rubricByAi && (
                        <span className="row" style={{ gap: 4, color: 'var(--ink)' }}>
                          <ShieldCheck size={12} strokeWidth={2.6} />
                          <span className="caption" style={{ fontWeight: 700 }}>0G</span>
                        </span>
                      )}
                    </div>
                    <Textarea value={r.rubric} onChange={(e) => setRubric(i, e.target.value)} />
                    {r.rubricRequestId && (
                      <p className="caption t-subtle mono" style={{ marginTop: 4, fontSize: 10 }}>0G · {r.rubricRequestId.slice(0, 20)}</p>
                    )}
                  </Block>
                ))}
                <Block tight>
                  <Button variant="secondary" size="sm" loading={rubricLoading} onClick={generateRubrics}>
                    Regenerate
                  </Button>
                </Block>
              </>
            )}
          </Panel>
        </section>

        <section style={{ marginTop: 28 }}>
          <SectionLabel icon={<Icon name="coins" set="objects" size={16} />}>Rewards</SectionLabel>
          <Panel>
            <Block>
              <Field label="On arrival" hint="Paid the moment someone scans your code.">
                <UnitInput unit="USDC" value={form.arrivalReward} onChange={(e) => set('arrivalReward', e.target.value)} />
              </Field>
            </Block>
            <Block>
              <Field label="On completion" hint="Paid once you verify the tasks.">
                <UnitInput unit="USDC" value={form.mainReward} onChange={(e) => set('mainReward', e.target.value)} />
              </Field>
            </Block>
          </Panel>
        </section>

        <section style={{ marginTop: 28 }}>
          <Panel tone="pink">
            <Block>
              <span className="overline">You will stake</span>
              <div style={{ marginTop: 10 }}>
                <Money value={total} size="hero" chip />
              </div>
              <p className="body-sm" style={{ marginTop: 10, opacity: 0.75 }}>
                per hunter who completes the full hunt
              </p>
            </Block>
          </Panel>
        </section>

        <div className="pad" style={{ marginTop: 32 }}>
          <Button variant="ink" size="lg" block loading={loading} onClick={submit}>
            Create and fund
          </Button>
        </div>
      </div>
      <Toast message={toast.message} onDone={toast.clear} />
    </>
  );
}
