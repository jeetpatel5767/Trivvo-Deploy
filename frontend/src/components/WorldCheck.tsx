import { useRef, useState } from 'react';
import {
  IDKitRequestWidget,
  proofOfHuman,
  any,
  CredentialRequest,
  type IDKitResult,
} from '@worldcoin/idkit';
import { isInWorldApp } from '@worldcoin/idkit-core';
import { Button, Block, Panel } from '../ui';
import api from '../lib/api';

/**
 * C3 — human check with World ID.
 *
 * One IDKit widget covers both environments: inside World App it verifies natively
 * (no app switch); in a desktop/Chrome browser the same widget shows a QR / deep link
 * and brings the user back. isInWorldApp() is used only to show honest copy — IDKit
 * handles the mechanics itself (confirmed in S1).
 *
 * Two actions:
 *   - 'tr-vvo-arrival' (default): any unique human. proofOfHuman accepts both the newer
 *     v4 proof and older orb proofs (allow_legacy_proofs: true), so the widest set of
 *     World users can check in.
 *   - 'tr-vvo-main': the stronger-credential gate for rewards over $5 (C5). Requires a
 *     v4 credential (passport / selfie / mnc), so allow_legacy_proofs is false.
 *
 * The signing key never leaves the backend: we fetch the signed RP context, open World,
 * then post the full proof to /api/verify/world, which validates it and stores one
 * nullifier per (hunt, action). Our per-hunt uniqueness lives there, not in the action.
 */

const WORLD_APP_ID =
  (import.meta.env.VITE_WORLD_APP_ID as `app_${string}`) || 'app_a3038950a55b59d8386cb7bccf8dd633';

type WorldAction = 'tr-vvo-arrival' | 'tr-vvo-main';

/** 'staging' pairs with an app_staging_ id and the World ID simulator; production by default. */
const WORLD_ENV = (import.meta.env.VITE_WORLD_ENV as 'production' | 'staging' | undefined) || 'production';

interface RpContext {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
}

export function WorldCheck({
  huntId,
  walletAddress,
  action = 'tr-vvo-arrival',
  onVerified,
  onRefused,
}: {
  huntId: string;
  walletAddress: string;
  action?: WorldAction;
  onVerified: (nullifierHash?: string) => void;
  /** The backend refused the proof (e.g. duplicate_human): the page shows its own denied state. */
  onRefused?: (code: string, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  // Each hunt has its own World action (World allows one verification per person per action),
  // so the backend tells us which one to use for this hunt.
  const [worldAction, setWorldAction] = useState<string>(action);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const strong = action === 'tr-vvo-main';
  const inWorldApp = isInWorldApp();

  const start = async () => {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/verify/world/signature', {
        huntId,
        kind: action === 'tr-vvo-main' ? 'main' : 'arrival',
      });
      setWorldAction(data.action);
      // Backend returns `sig`; the IDKit RpContext field is `signature`.
      setRpContext({
        rp_id: data.rp_id,
        nonce: data.nonce,
        created_at: data.created_at,
        expires_at: data.expires_at,
        signature: data.sig,
      });
      setOpen(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not start the human check. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Carries the backend's nullifier from handleVerify to onSuccess (a ref, not render state).
  const nullifierRef = useRef<string | undefined>(undefined);

  // IDKit swallows errors thrown in handleVerify and reports only 'failed_by_host_app',
  // so the backend's own code is kept here and read back in onError.
  const refusalRef = useRef<{ code: string; message: string } | null>(null);

  const send = async (result: IDKitResult): Promise<void> => {
    try {
      const { data } = await api.post('/verify/world', { huntId, walletAddress, action: worldAction, result });
      if (!data?.success) throw new Error(data?.error || 'Human check failed');
      nullifierRef.current = data.nullifierHash as string | undefined;
    } catch (e: unknown) {
      const d = (e as { response?: { data?: { code?: string; error?: string } } })?.response?.data;
      refusalRef.current = { code: d?.code || 'verification_failed', message: d?.error || 'Human check failed. Try again.' };
      throw e;
    }
  };

  const handleError = (code: string) => {
    // World itself refuses a second check for this hunt's action: the same person already claimed here.
    if ((code === 'max_verifications_reached' || code === 'nullifier_replayed') && onRefused) {
      refusalRef.current = null;
      return onRefused('duplicate_human', 'This person has already claimed in this hunt.');
    }
    const refusal = refusalRef.current;
    refusalRef.current = null;
    if (refusal && onRefused) return onRefused(refusal.code, refusal.message);
    setError(refusal?.message || `Human check not completed (${code}). Try again.`);
  };


  // The proof this action asks for. Arrival: any unique human (legacy proofs allowed).
  // Main: a stronger v4 credential (passport OR selfie OR mnc), no legacy.
  const strongConstraints = any(
    CredentialRequest('passport'),
    CredentialRequest('selfie'),
    CredentialRequest('mnc')
  );

  return (
    <Panel>
      <Block>
        <span className="overline t-subtle">Human check</span>
        <p className="body-sm t-muted" style={{ marginTop: 8 }}>
          {strong
            ? 'This reward needs a stronger World ID credential (passport, selfie or mobile number). One check per hunt.'
            : 'Prove you are a unique person to collect this reward. One check per hunt.'}
        </p>
        <p className="caption t-subtle" style={{ marginTop: 6 }}>
          {inWorldApp ? 'Verifies right here in World App.' : 'Opens World App to verify, then brings you back.'}
        </p>
      </Block>
      {error && (
        <Block tight>
          <p className="caption" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        </Block>
      )}
      <Block tight>
        <Button variant="ink" size="lg" block loading={busy} onClick={start}>
          Verify with World ID
        </Button>
      </Block>

      {rpContext &&
        (strong ? (
          <IDKitRequestWidget
            open={open}
            onOpenChange={setOpen}
            app_id={WORLD_APP_ID}
            action={worldAction}
            rp_context={rpContext}
            environment={WORLD_ENV}
            allow_legacy_proofs={false}
            constraints={strongConstraints}
            handleVerify={async (result: IDKitResult) => {
              await send(result);
            }}
            onSuccess={() => {
              setOpen(false);
              onVerified(nullifierRef.current);
            }}
            onError={handleError}
          />
        ) : (
          <IDKitRequestWidget
            open={open}
            onOpenChange={setOpen}
            app_id={WORLD_APP_ID}
            action={worldAction}
            rp_context={rpContext}
            environment={WORLD_ENV}
            allow_legacy_proofs={true}
            preset={proofOfHuman({ signal: walletAddress })}
            handleVerify={async (result: IDKitResult) => {
              await send(result);
            }}
            onSuccess={() => {
              setOpen(false);
              onVerified(nullifierRef.current);
            }}
            onError={handleError}
          />
        ))}
    </Panel>
  );
}
