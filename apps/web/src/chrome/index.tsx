import { SURFACE } from '../theme/tokens.js';
import './chrome.css';
import { DetailPanel } from './detail.js';
import { FilterPanel } from './filter.js';
import { EntityList } from './list.js';

export { DetailPanel } from './detail.js';
export { FilterPanel } from './filter.js';
export { FreshnessReadout, formatAge, useFreshness } from './freshness.js';
export { EntityList, listRows, useListRows } from './list.js';
export { TopBar } from './topbar.js';

export function Chrome(): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* The sidebar scrolls; the way to find anything should not scroll away with it. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 1, background: SURFACE }}>
        <FilterPanel />
      </div>
      <EntityList />
      <DetailPanel />
    </div>
  );
}
