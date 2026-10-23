import { domMax, LazyMotion, MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './theme/tokens.css';

const root = document.getElementById('root');
if (!root) throw new Error('no #root element');

createRoot(root).render(
  <StrictMode>
    {/* `domMax` rather than `domAnimation`: the card reflow is a layout animation, and
        `domAnimation` would drop it silently rather than fail. */}
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);
