import { describe, expect, test } from "bun:test";

import { personalSite } from "../src/site";
import { createWebsiteDirectWorld, parseWebsiteDirectWorld } from "./world";

const valid = () => createWebsiteDirectWorld({
  appearance: { preference: "system", resolved: "dark", writeFailure: null },
  content: personalSite,
});

describe("personal website Direct world", () => {
  test("round trips a strict version 1 JSON world", () => {
    const world = valid();
    expect(parseWebsiteDirectWorld(JSON.parse(JSON.stringify(world)) as unknown)).toEqual(world);
    expect(Object.isFrozen(world.content.projects)).toBeTrue();
  });

  test("rejects unknown keys, bad versions, duplicate IDs, and inconsistent themes", () => {
    expect(() => parseWebsiteDirectWorld({ ...valid(), extra: true })).toThrow("unknown key");
    expect(() => parseWebsiteDirectWorld({ ...valid(), version: 2 })).toThrow("version must be 1");
    const duplicate = valid();
    expect(() => parseWebsiteDirectWorld({
      ...duplicate,
      content: { ...duplicate.content, projects: [duplicate.content.projects[0], duplicate.content.projects[0]] },
    })).toThrow("repeats ID");
    expect(() => parseWebsiteDirectWorld({
      ...valid(),
      appearance: { preference: "light", resolved: "dark", writeFailure: null },
    })).toThrow("must equal");
  });

  test("rejects social identifiers without a shared icon", () => {
    expect(() => parseWebsiteDirectWorld({
      ...valid(),
      content: {
        ...valid().content,
        socialLinks: [{
          ...valid().content.socialLinks[0],
          id: "unsupported",
        }],
      },
    })).toThrow("must name a supported social icon");
  });
});
