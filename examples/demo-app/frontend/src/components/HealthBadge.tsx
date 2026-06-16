'use client';

import { useEffect, useState } from 'react';
import { checkBackendHealth, type HealthResult } from '@/lib/health-check';

const STATE_COPY: Record<HealthResult['state'], string> = {
  idle: 'Idle',
  checking: 'Checking backend…',
  online: 'Backend online',
  offline: 'Backend unreachable',
};

/**
 * Calls the demo backend's health endpoint on mount and renders a live
 * status pill. Demonstrates real FE↔BE wiring rather than a static
 * "everything is fine" badge — the three visual states (checking, online,
 * offline) all render distinctly so the wiring is visibly proven either way.
 */
export default function HealthBadge() {
  const [result, setResult] = useState<HealthResult>({ state: 'checking', message: STATE_COPY.checking });

  useEffect(() => {
    let active = true;

    checkBackendHealth().then((next) => {
      if (active) {
        setResult(next);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`health-badge health-badge--${result.state}`} role="status">
      <span className="health-badge__dot" aria-hidden="true" />
      <span className="health-badge__label">{STATE_COPY[result.state]}</span>
      <span className="health-badge__message">{result.message}</span>
    </div>
  );
}
