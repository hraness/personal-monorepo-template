import { describe, expect, test } from "bun:test";

import {
  homepageBombadilCampaigns,
  parseHomepageBombadilSelection,
} from "./bombadil-matrix";

describe("homepage Bombadil matrix", () => {
  test("runs every declared appearance and content world by default", () => {
    const parsed = parseHomepageBombadilSelection(["--time-limit", "45s"]);
    expect(parsed.campaigns).toEqual(homepageBombadilCampaigns);
    expect(parsed.runnerArguments).toEqual(["--time-limit", "45s"]);
  });

  test("selects one scenario for focused replay", () => {
    const parsed = parseHomepageBombadilSelection([
      "--campaign=homepage.dark",
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
      "homepage.light",
      "--campaign=homepage.dark",
    ])).toThrow("only once");
    expect(() => parseHomepageBombadilSelection([
      "--campaign=homepage.missing",
    ])).toThrow("Unknown Bombadil scenario");
    expect(() => parseHomepageBombadilSelection([
      "--replay=artifacts/direct-bombadil/example/trace.jsonl",
    ])).toThrow("requires --campaign");
  });
});
