# agent-fleet-view

A local proof of concept for a live, read-only view of agent infrastructure: what is running
right now, across everything, with a click through to the tool that manages it.

See [docs/PLAN.md](docs/PLAN.md) for the design rules and the task split.

## Running it

```bash
nvm use            # Node 24; anything >= 22 works
pnpm install
pnpm check         # build, lint, test — the gate
pnpm dev           # server on 8787, web on 5173
pnpm fixtures      # regenerate fixtures/ from the scenario data
```

Until task T7 lands, the web app replays the golden fixtures without needing the server.
