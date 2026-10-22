import type { Scenario } from '../scenario.js';
import { scenario01 } from './scenario-01.js';
import { scenario02 } from './scenario-02.js';

export const SCENARIOS: Scenario[] = [scenario01, scenario02];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export { scenario01, scenario02 };
