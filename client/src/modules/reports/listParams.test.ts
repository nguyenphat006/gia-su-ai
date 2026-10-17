import { describe, expect, it } from "vitest";
import { buildListParams, ownFilterKeys } from "./listParams";

describe("buildListParams", () => {
  it("replaces raw scope params from the URL with the normalised scope", () => {
    const params = buildListParams({ page: 1, page_size: 20, grade: "12", date_from: "bad", blocked: "true" }, { date_from: "2026-10-01", date_to: "2026-10-17" });
    expect(params).toEqual({ page: 1, page_size: 20, blocked: "true", date_from: "2026-10-01", date_to: "2026-10-17" });
  });

  it("keeps date filters of an unscoped (embedded) list", () => {
    const params = buildListParams({ page: 1, date_from: "2026-01-01", date_to: "2026-02-01" }, { user: 7 }, { scoped: false });
    expect(params).toEqual({ page: 1, date_from: "2026-01-01", date_to: "2026-02-01", user: 7 });
  });

  it("renames the search param when the API expects another name", () => {
    expect(buildListParams({ page: 1, search: "quang hợp" }, { user: 5 }, { searchParam: "q" })).toEqual({ page: 1, q: "quang hợp", user: 5 });
    expect(buildListParams({ page: 1, search: "x" }, {})).toEqual({ page: 1, search: "x" });
  });

  it("skips empty base values", () => {
    expect(buildListParams({ page: 2 }, { user: undefined, grade: "" })).toEqual({ page: 2 });
  });
});

describe("ownFilterKeys", () => {
  it("ignores scope keys on the scoped page", () => {
    expect(ownFilterKeys({ grade: "7", school_class: "1", mode: "AI", date_to: "2026-10-01" })).toEqual(["mode"]);
  });

  it("counts every filter of an unscoped list", () => {
    expect(ownFilterKeys({ mode: "AI", date_to: "2026-10-01" }, false)).toEqual(["mode", "date_to"]);
  });
});
