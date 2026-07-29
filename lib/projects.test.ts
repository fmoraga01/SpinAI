import { describe, expect, it } from "vitest";
import { mondayOf, rowToProject, rowToUpdate, VALID_STATUSES } from "./projects";

describe("rowToProject", () => {
  it("maps status from the row (R9), along with the other existing fields", () => {
    const project = rowToProject({
      id: "p1",
      name: "Proyecto X",
      summary: "Resumen",
      country: "Chile",
      business_unit: "Unidad A",
      status: "piloto",
      project_kpis: [
        { label: "KPI B", value: "2", position: 1 },
        { label: "KPI A", value: "1", position: 0 },
      ],
      project_weekly_updates: [{ id: "u1", week_of: "2026-07-06", note: "Avance" }],
    });

    expect(project.status).toBe("piloto");
    expect(project.businessUnit).toBe("Unidad A");
    expect(project.kpis).toEqual([
      { label: "KPI A", value: "1" },
      { label: "KPI B", value: "2" },
    ]);
    expect(project.updates).toEqual([{ id: "u1", weekOf: "2026-07-06", note: "Avance" }]);
  });
});

describe("rowToUpdate", () => {
  it("maps a row to a WeeklyUpdate without a status property (R10)", () => {
    const update = rowToUpdate({ id: "u1", week_of: "2026-07-06", note: "Avance" });

    expect(update).toEqual({ id: "u1", weekOf: "2026-07-06", note: "Avance" });
    expect(update).not.toHaveProperty("status");
  });
});

describe("VALID_STATUSES", () => {
  it("contains exactly the 3 expected statuses (R14)", () => {
    expect(VALID_STATUSES).toEqual(["desarrollo", "piloto", "produccion"]);
  });
});

describe("mondayOf", () => {
  it("maps a Monday to itself", () => {
    expect(mondayOf("2026-07-06")).toBe("2026-07-06");
  });

  it("maps a Sunday to the previous Monday, not the next one", () => {
    expect(mondayOf("2026-07-05")).toBe("2026-06-29");
  });

  it("maps a midweek Wednesday to the Monday of that same week", () => {
    expect(mondayOf("2026-07-08")).toBe("2026-07-06");
  });

  it("handles a month boundary correctly (Saturday Aug 1 -> Monday in July)", () => {
    expect(mondayOf("2026-08-01")).toBe("2026-07-27");
  });
});
