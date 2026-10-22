import { useEffect } from 'react';
import { Chrome, TopBar } from './chrome/index.js';
import { DebugPanel } from './debug/index.js';
import { Floor } from './floor/index.js';
import type { FleetClient } from './net/index.js';
import { createLiveClient, createMockClient } from './net/index.js';
import { store } from './store/index.js';

const panel: React.CSSProperties = {
  background: 'var(--surface)',
  borderRight: '1px solid var(--line)',
  overflow: 'auto',
};

/** `?source=fixtures` replays the golden snapshots instead, for working without the server. */
function chooseClient(): { client: FleetClient; source: 'fixtures' | 'live' } {
  const wanted = new URLSearchParams(window.location.search).get('source');
  return wanted === 'fixtures'
    ? { client: createMockClient(), source: 'fixtures' }
    : { client: createLiveClient(), source: 'live' };
}

export function App(): React.ReactElement {
  useEffect(() => {
    const { client, source } = chooseClient();
    store.setSource(source);
    store.registerSender(client.send);
    client.connect();
    return () => client.disconnect();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <TopBar />
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr auto', minHeight: 0 }}>
        <aside style={panel}>
          <Chrome />
        </aside>
        <main style={{ overflow: 'hidden' }}>
          <Floor />
        </main>
        <aside style={{ ...panel, borderRight: 'none', borderLeft: '1px solid var(--line)' }}>
          <DebugPanel />
        </aside>
      </div>
    </div>
  );
}
