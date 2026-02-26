import type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { createRuntimeEnv } from "../../test-utils/runtime-env.js";
import type { ResolvedNextcloudTalkAccount } from "./accounts.js";
import { nextcloudTalkPlugin } from "./channel.js";
import { monitorNextcloudTalkProvider } from "./monitor.js";

vi.mock("./monitor.js", () => ({
  monitorNextcloudTalkProvider: vi.fn(async () => ({ stop: vi.fn() })),
}));

function createStartAccountCtx(params: {
  abortSignal?: AbortSignal;
}): ChannelGatewayContext<ResolvedNextcloudTalkAccount> {
  const snapshot: ChannelAccountSnapshot = {
    accountId: "default",
    configured: true,
    enabled: true,
    running: false,
  };

  return {
    accountId: "default",
    account: {
      accountId: "default",
      name: "default",
      enabled: true,
      secret: "secret",
      secretSource: "config",
      baseUrl: "https://nextcloud.example",
      config: {} as ResolvedNextcloudTalkAccount["config"],
    },
    cfg: {} as OpenClawConfig,
    runtime: createRuntimeEnv(),
    abortSignal: params.abortSignal ?? new AbortController().signal,
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    getStatus: () => snapshot,
    setStatus: vi.fn(),
  };
}

describe("nextcloudTalkPlugin gateway.startAccount", () => {
  it("stays running until aborted after webhook server starts", async () => {
    const abort = new AbortController();
    const task = nextcloudTalkPlugin.gateway!.startAccount!(
      createStartAccountCtx({ abortSignal: abort.signal }),
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(monitorNextcloudTalkProvider).toHaveBeenCalledTimes(1);

    let settled = false;
    void task.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    abort.abort();
    await task;
    expect(settled).toBe(true);
  });
});
