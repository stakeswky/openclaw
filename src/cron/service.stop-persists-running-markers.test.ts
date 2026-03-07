import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { CronService } from "./service.js";
import { createNoopLogger } from "./service.test-harness.js";
import type { CronJob } from "./types.js";

function makeRunningJob(now: number): CronJob {
  return {
    id: "job-running",
    name: "job-running",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: 60_000, anchorMs: now },
    payload: { kind: "systemEvent", text: "tick" },
    state: {
      nextRunAtMs: now + 60_000,
      runningAtMs: now - 5_000,
    },
    wakeMode: "next-heartbeat",
    sessionTarget: "main",
  };
}

describe("CronService.stop", () => {
  it("clears persisted running markers before shutdown completes", async () => {
    const root = await fs.mkdtemp("/tmp/openclaw-cron-stop-");
    const storePath = `${root}/cron/jobs.json`;
    const now = 1_700_000_000_000;
    const logger = createNoopLogger();

    const cron = new CronService({
      cronEnabled: true,
      storePath,
      log: logger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => ({ status: "ok" as const })),
    });

    await cron.start();
    const created = await cron.add({
      name: "job-running",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: now },
      payload: { kind: "systemEvent", text: "tick" },
      wakeMode: "next-heartbeat",
      sessionTarget: "main",
    });

    const raw = await fs.readFile(storePath, "utf-8");
    const store = JSON.parse(raw) as { version: number; jobs: CronJob[] };
    store.jobs = [
      {
        ...makeRunningJob(now),
        id: created.id,
        name: created.name,
      },
    ];
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");

    await cron.stop();

    const afterRaw = await fs.readFile(storePath, "utf-8");
    const afterStore = JSON.parse(afterRaw) as { jobs: CronJob[] };
    expect(afterStore.jobs[0]?.state.runningAtMs).toBeUndefined();

    await fs.rm(root, { recursive: true, force: true });
  });
});
