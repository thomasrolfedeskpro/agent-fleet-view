import { layoutContainer, layoutOverview } from '@fleet/layout';
import { useStore, visible } from '../store/index.js';

/**
 * Placeholder. Task T4 replaces this file's contents with the PixiJS surface; the signature
 * and the mount point stay as they are.
 */
export function Floor(): React.ReactElement {
  const items = useStore(visible);
  const view = useStore((s) => s.view);
  const layout =
    view.mode === 'overview' ? layoutOverview(items) : layoutContainer(view.containerId, items);

  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
      <p style={{ color: 'var(--quiet)', margin: '0 0 12px' }}>
        Floor renderer — task T4. {items.length} entities, {layout.cells.length} cells.
      </p>
      <pre style={{ fontSize: 11, lineHeight: 1.5, margin: 0 }}>
        {JSON.stringify(items, null, 2)}
      </pre>
    </div>
  );
}
