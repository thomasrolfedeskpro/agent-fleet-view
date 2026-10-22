import type { Scenario } from '../scenario.js';
import { scenario01 } from './scenario-01.js';

export const SCENARIOS: Scenario[] = [scenario01];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export { scenario01 };
