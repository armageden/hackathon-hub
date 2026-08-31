import { describe, it, expect } from "vitest";
import {
  REAL_EVENT_ID,
  getActiveEventId,
  setCurrentEventId,
} from "./event-id";

describe("event id selection", () => {
  it("defaults to the real event id", () => {
    expect(getActiveEventId()).toBe(REAL_EVENT_ID);
  });

  it("returns the selected event once set", () => {
    setCurrentEventId("some-event-id");
    expect(getActiveEventId()).toBe("some-event-id");
  });
});
