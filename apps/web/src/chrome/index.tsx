import { LINE } from '../theme/tokens.js';
import { Breadcrumb } from './breadcrumb.js';
import { DetailPanel } from './detail.js';
import { FreshnessReadout } from './freshness.js';
import { EntityList } from './list.js';
import { SummaryStrip } from './summary.js';

export { Breadcrumb } from './breadcrumb.js';
export { DetailPanel } from './detail.js';
export { FreshnessReadout, formatAge, useFreshness } from './freshness.js';
export { EntityList } from './list.js';
export { SummaryStrip } from './summary.js';

export function Chrome(): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 16px',
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <Breadcrumb />
        <FreshnessReadout />
      </header>
      <SummaryStrip />
      <EntityList />
      <DetailPanel />
    </div>
  );
}
