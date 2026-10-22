import { useEffect } from 'react';
import { Chrome } from './chrome/index.js';
import { DebugPanel } from './debug/index.js';
import { Floor } from './floor/index.js';
import { createMockClient } from './net/index.js';
import { store } from './store/index.js';

const panel: React.CSSProperties = {
  background: 'var(--surface)',
  borderRight: '1px solid var(--line)',
  overflow: 'auto',
};

export function App(): React.ReactElement {
  useEffect(() => {
    const client = createMockClient();
    store.registerSender(client.send);
    client.connect();
    return () => client.disconnect();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', height: '100%' }}>
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
  );
}
