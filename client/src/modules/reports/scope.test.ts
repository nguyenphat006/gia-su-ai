import { describe, expect, it } from "vitest";
import { defaultRange, isScopeKey, parseScope, scopeToParams, tabHref } from "./scope";

const TODAY = new Date(2026, 9, 17); // 17/10/2026
const sp = (qs: string) => new URLSearchParams(qs);

describe("defaultRange", () => {
  it("covers the last 30 days including today", () => {
    expect(defaultRange(TODAY)).toEqual(["2026-09-18", "2026-10-17"]);
  });

  it("crosses year boundaries", () => {
    expect(defaultRange(new Date(2026, 0, 10))).toEqual(["2025-12-12", "2026-01-10"]);
  });
});

describe("parseScope", () => {
  it("defaults to the last 30 days with no grade / class", () => {
    expect(parseScope(sp(""), TODAY)).toEqual({ dateFrom: "2026-09-18", dateTo: "2026-10-17", grade: null, schoolClass: null, isDefaultRange: true });
  });

  it("reads a full scope", () => {
    const scope = parseScope(sp("date_from=2026-10-01&date_to=2026-10-10&grade=8&school_class=12"), TODAY);
    expect(scope).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-10", grade: "8", schoolClass: "12", isDefaultRange: false });
  });

  it("swaps a reversed range", () => {
    const scope = parseScope(sp("date_from=2026-10-10&date_to=2026-10-01"), TODAY);
    expect([scope.dateFrom, scope.dateTo]).toEqual(["2026-10-01", "2026-10-10"]);
  });

  it("fills a missing end with today and a missing start with 30 days before the end", () => {
    expect(parseScope(sp("date_from=2026-10-05"), TODAY)).toMatchObject({ dateFrom: "2026-10-05", dateTo: "2026-10-17", isDefaultRange: false });
    expect(parseScope(sp("date_to=2026-06-30"), TODAY)).toMatchObject({ dateFrom: "2026-06-01", dateTo: "2026-06-30" });
  });

  it("ignores invalid values", () => {
    const scope = parseScope(sp("date_from=2026-02-30&date_to=abc&grade=12&school_class=x1"), TODAY);
    expect(scope).toEqual({ dateFrom: "2026-09-18", dateTo: "2026-10-17", grade: null, schoolClass: null, isDefaultRange: true });
  });
});

describe("scopeToParams", () => {
  it("always sends dates and only set filters", () => {
    expect(scopeToParams(parseScope(sp(""), TODAY))).toEqual({ date_from: "2026-09-18", date_to: "2026-10-17" });
    expect(scopeToParams(parseScope(sp("grade=6&school_class=3"), TODAY))).toEqual({ date_from: "2026-09-18", date_to: "2026-10-17", grade: "6", school_class: "3" });
  });
});

describe("tabHref", () => {
  it("keeps scope params and drops list state of the previous tab", () => {
    expect(tabHref("/reports", "grade=7&q=abc&page=3&ordering=-total_xp&tab=students", "chat", "overview")).toBe("/reports?grade=7&tab=chat");
  });

  it("omits the default tab", () => {
    expect(tabHref("/reports", "tab=chat&blocked=true", "overview", "overview")).toBe("/reports");
    expect(tabHref("/reports", "date_from=2026-10-01&date_to=2026-10-02", "overview", "overview")).toBe("/reports?date_from=2026-10-01&date_to=2026-10-02");
  });
});

describe("isScopeKey", () => {
  it("recognises scope keys only", () => {
    expect(isScopeKey("school_class")).toBe(true);
    expect(isScopeKey("blocked")).toBe(false);
  });
});
