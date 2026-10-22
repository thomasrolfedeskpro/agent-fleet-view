import { useEffect, useRef } from 'react';
import { createStage } from './stage.js';

const host: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: 'var(--floor)',
};

/**
 * Mounts the canvas once and never renders again. Everything that changes with a snapshot is
 * handled by the Pixi layer, which subscribes to the store itself.
 */
export function Floor(): React.ReactElement {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    const stage = createStage(element);
    return () => stage.destroy();
  }, []);

  return <div ref={mount} style={host} />;
}
