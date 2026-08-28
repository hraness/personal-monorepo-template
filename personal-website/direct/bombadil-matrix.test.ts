import { describe, expect, test } from "bun:test";

import {
  assertHomepageBombadilCatalog,
  homepageBombadilCampaigns,
  parseHomepageBombadilSelection,
} from "./bombadil-matrix";

describe("homepage Bombadil matrix", () => {
  test("runs every declared appearance and content world by default", () => {
    const parsed = parseHomepageBombadilSelection(["--time-limit", "45s"]);
    expect(parsed.campaigns).toEqual(homepageBombadilCampaigns);
    expect(parsed.campaigns.map((campaign) => campaign.scenario)).toEqual([
      "homepage.light",
      "homepage.dark",
      "homepage.long-content",
    ]);
    expect(parsed.runnerArguments).toEqual(["--time-limit", "45s"]);
  });

  test("selects one scenario for focused replay", () => {
    const parsed = parseHomepageBombadilSelection([
      "--campaign=dark-wide",
      "--replay",
      "artifacts/direct-bombadil/example/trace.jsonl",
    ]);
    expect(parsed.campaigns.map((campaign) => campaign.scenario)).toEqual([
      "homepage.dark",
    ]);
    expect(parsed.runnerArguments).toEqual([
      "--replay",
      "artifacts/direct-bombadil/example/trace.jsonl",
    ]);
  });

  test("rejects ambiguous and unknown campaign selection", () => {
    expect(() => parseHomepageBombadilSelection([
      "--campaign",
      "light-wide",
      "--campaign=dark-wide",
    ])).toThrow("only once");
    expect(() => parseHomepageBombadilSelection([
      "--campaign=missing",
    ])).toThrow("Unknown Bombadil scenario");
    expect(() => parseHomepageBombadilSelection([
      "--replay=artifacts/direct-bombadil/example/trace.jsonl",
    ])).toThrow("requires --campaign");
  });

  test("fails closed when the Direct catalog and campaign metadata drift", () => {
    expect(() => assertHomepageBombadilCatalog(
      ["homepage.light", "homepage.added"],
      ["homepage.light"],
    )).toThrow("unconfigured=homepage.added");
    expect(() => assertHomepageBombadilCatalog(
      ["homepage.light"],
      ["homepage.light", "homepage.removed"],
    )).toThrow("stale=homepage.removed");
  });
});
