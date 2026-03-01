import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { runWebHeartbeatOnce } from "./heartbeat-runner.js";

describe("runWebHeartbeatOnce (timestamp)", () => {
  it("injects a cron-style Current time line into the heartbeat prompt", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-web-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    try {
      await fs.writeFile(storePath, JSON.stringify({}, null, 2));

      const replyResolver = vi.fn().mockResolvedValue([{ text: "HEARTBEAT_OK" }]);
      const cfg = {
        agents: {
          defaults: {
            heartbeat: { prompt: "Ops check", every: "5m" },
            userTimezone: "America/Chicago",
            timeFormat: "24",
          },
        },
        session: { store: storePath },
        channels: { whatsapp: { allowFrom: ["*"] } },
      } as unknown as OpenClawConfig;

      await runWebHeartbeatOnce({
        cfg,
        to: "+1555",
        dryRun: true,
        replyResolver,
        sender: vi.fn(),
      });

      expect(replyResolver).toHaveBeenCalledTimes(1);
      const ctx = replyResolver.mock.calls[0]?.[0];
      expect(ctx?.Body).toMatch(/Ops check/);
      expect(ctx?.Body).toMatch(/Current time: /);
      expect(ctx?.Body).toMatch(/\(.+\)/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes heartbeat model override when configured", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-web-hb-model-"));
    const storePath = path.join(tmpDir, "sessions.json");
    try {
      await fs.writeFile(storePath, JSON.stringify({}, null, 2));

      const replyResolver = vi.fn().mockResolvedValue([{ text: "HEARTBEAT_OK" }]);
      const cfg = {
        gateway: { defaultModel: "openai/gpt-4o-mini" },
        agents: {
          defaults: {
            heartbeat: { every: "5m", model: "anthropic/claude-haiku-4-5-20251001" },
          },
        },
        session: { store: storePath },
        channels: { whatsapp: { allowFrom: ["*"] } },
      } as unknown as OpenClawConfig;

      await runWebHeartbeatOnce({
        cfg,
        to: "+1555",
        dryRun: true,
        replyResolver,
        sender: vi.fn(),
      });

      expect(replyResolver).toHaveBeenCalledTimes(1);
      const replyOpts = replyResolver.mock.calls[0]?.[1];
      expect(replyOpts).toEqual({
        isHeartbeat: true,
        heartbeatModelOverride: "anthropic/claude-haiku-4-5-20251001",
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
