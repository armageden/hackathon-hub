import { describe, it, expect, vi } from "vitest";

vi.mock("../../db/demo-data.js", () => ({
  enableDemoData: vi.fn(),
  disableDemoData: vi.fn(),
  demoDataStatus: vi.fn(),
  demoEventExists: vi.fn(),
  demoRowCounts: vi.fn(),
}));

import { demoService } from "./demo.service.js";
import {
  enableDemoData,
  disableDemoData,
} from "../../db/demo-data.js";

const demoData = {
  enable: enableDemoData as unknown as ReturnType<typeof vi.fn>,
  disable: disableDemoData as unknown as ReturnType<typeof vi.fn>,
};

describe("demoService", () => {
  it("enable delegates to enableDemoData and returns counts", async () => {
    demoData.enable.mockResolvedValue({ hardware_items: 8 });
    const counts = await demoService.enable();
    expect(counts).toEqual({ hardware_items: 8 });
    expect(demoData.enable).toHaveBeenCalledTimes(1);
  });

  it("disable delegates to disableDemoData", async () => {
    demoData.disable.mockResolvedValue({});
    await demoService.disable();
    expect(demoData.disable).toHaveBeenCalledTimes(1);
  });
});

