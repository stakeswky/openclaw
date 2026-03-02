import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("sherpa-onnx-tts CLI", () => {
  it("boots under ESM and reaches runtime/model validation", () => {
    const scriptPath = path.join(
      process.cwd(),
      "skills",
      "sherpa-onnx-tts",
      "bin",
      "sherpa-onnx-tts",
    );
    const result = spawnSync(process.execPath, [scriptPath, "hello"], {
      encoding: "utf-8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing runtime/model directory.");
    expect(result.stderr).not.toContain("require is not defined in ES module scope");
  });
});
