import { Icon } from '../../components/Icon';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { createHunt, login, OFFLINE } from '../../lib/api';
import { useDemoAccount } from '../../lib/demoAccount';
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

  const set = (field: string, value: string) => setForm({ ...form, [field]: value });
  const addTask = () => setForm({ ...form, tasks: [...form.tasks, ''] });
  const setTask = (i: number, v: string) =>
    setForm({ ...form, tasks: form.tasks.map((t, idx) => (idx === i ? v : t)) });
  const rmTask = (i: number) => setForm({ ...form, tasks: form.tasks.filter((_, idx) => idx !== i) });

  const total = (parseFloat(form.arrivalReward) || 0) + (parseFloat(form.mainReward) || 0);

  const submit = async () => {
    setLoading(true);
    try {
      await login(address!, 'vendor', 'My Business');
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
        tasks: form.tasks.filter(Boolean),
      });
      navigate(`/vendor/qr/${res.data.hunt.hunt_id}`);
    } catch (err: any) {
      toast.show(err?.response?.data?.error || 'That did not save. Try again.');
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
