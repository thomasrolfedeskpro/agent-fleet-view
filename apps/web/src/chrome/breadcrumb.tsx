import { byId, store, useStore } from '../store/index.js';
import { INK, QUIET } from '../theme/tokens.js';
import { resetButton } from './styles.js';

export function Breadcrumb(): React.ReactElement {
  const view = useStore((s) => s.view);
  const container = useStore((s) =>
    s.view.mode === 'inside' ? byId(s, s.view.containerId) : undefined,
  );

  if (view.mode === 'overview') {
    return (
      <nav data-testid="breadcrumb" style={{ fontSize: 11, color: QUIET }}>
        Fleet
      </nav>
    );
  }

  return (
    <nav
      data-testid="breadcrumb"
      style={{ fontSize: 11, color: QUIET, display: 'flex', gap: 4, alignItems: 'baseline' }}
    >
      <button
        type="button"
        data-testid="breadcrumb-up"
        style={{ ...resetButton, color: QUIET, textDecoration: 'underline' }}
        onClick={() => store.setView({ mode: 'overview' })}
      >
        Fleet
      </button>
      <span aria-hidden="true">/</span>
      <span style={{ color: INK }}>{container?.label ?? view.containerId}</span>
    </nav>
  );
}
