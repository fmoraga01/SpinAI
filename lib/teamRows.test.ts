import { describe, expect, it } from "vitest";
import { getNextFridays, nextFridayAfter, rowToAssignment, rowToLog, rowToMember, sanitizeTiming } from "./teamRows";

describe("rowToMember", () => {
  it("maps a raw Supabase row to a TeamMember, defaulting a null email to undefined", () => {
    expect(rowToMember({ id: "m1", name: "Ana", email: null, active: true, created_at: "2026-07-01" })).toEqual({
      id: "m1",
      name: "Ana",
      email: undefined,
      active: true,
      createdAt: "2026-07-01",
    });
  });
});

describe("rowToAssignment", () => {
  it("maps a raw Supabase row to an Assignment, defaulting null member fields", () => {
    expect(
      rowToAssignment({ id: "a1", member_id: null, member_name: null, date: "2026-08-07", created_at: "2026-07-01" })
    ).toEqual({ id: "a1", memberId: null, memberName: null, date: "2026-08-07", createdAt: "2026-07-01" });
  });
});

describe("rowToLog", () => {
  it("maps a raw assignment_logs row to a LogEntry", () => {
    expect(
      rowToLog({
        id: "l1",
        member_a_name: "Ana",
        member_b_name: "Beto",
        date_a: "2026-08-07",
        date_b: "2026-08-14",
        created_at: "2026-07-30",
      })
    ).toEqual({ id: "l1", memberAName: "Ana", memberBName: "Beto", dateA: "2026-08-07", dateB: "2026-08-14", createdAt: "2026-07-30" });
  });
});

describe("nextFridayAfter", () => {
  it("returns the same weekday 7 days later (used to place a new member's assignment)", () => {
    expect(nextFridayAfter("2026-08-07")).toBe("2026-08-14");
  });

  it("handles a month boundary correctly", () => {
    expect(nextFridayAfter("2026-07-31")).toBe("2026-08-07");
  });
});

describe("getNextFridays", () => {
  it("returns the requested count of dates, each 7 days apart", () => {
    const fridays = getNextFridays(4);
    expect(fridays).toHaveLength(4);
    for (let i = 1; i < fridays.length; i++) {
      const diffDays = (new Date(fridays[i]).getTime() - new Date(fridays[i - 1]).getTime()) / 86400000;
      expect(diffDays).toBe(7);
    }
  });

  it("only returns Fridays", () => {
    for (const date of getNextFridays(6)) {
      expect(new Date(date + "T12:00:00").getDay()).toBe(5);
    }
  });
});

describe("sanitizeTiming", () => {
  it("returns null when timing is disabled or malformed", () => {
    expect(sanitizeTiming(null, 3)).toBeNull();
    expect(sanitizeTiming({ enabled: false, items: [] }, 3)).toBeNull();
    expect(sanitizeTiming({ enabled: true, items: "not-an-array" }, 3)).toBeNull();
  });

  it("pads items to match the agenda length and defaults invalid minutes to 1", () => {
    const result = sanitizeTiming({ enabled: true, items: [{ minutes: 5, memberId: "m1", memberName: "Ana" }] }, 3);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(3);
    expect(result!.items[0]).toEqual({ minutes: 5, memberId: "m1", memberName: "Ana" });
    expect(result!.items[1]).toEqual({ minutes: 1, memberId: null, memberName: null });
  });

  it("derives totalMinutes from the items when not provided", () => {
    const result = sanitizeTiming({ enabled: true, items: [{ minutes: 4 }, { minutes: 6 }] }, 2);
    expect(result!.totalMinutes).toBe(10);
  });
});
