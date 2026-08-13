import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CollectionPageHeader } from "./collection-page-header";
import { publicSite } from "./site";

describe("collection page header", () => {
  test("keeps the home breadcrumb and page heading in one semantic header", () => {
    const markup = renderToStaticMarkup(
      <CollectionPageHeader title="reading">
        <p><a href="/reading/atom.xml">atom feed</a></p>
      </CollectionPageHeader>,
    );

    expect(markup).toStartWith('<header class="content-page-header">');
    expect(markup).toContain(
      `<nav aria-label="breadcrumb"><a href="/">${publicSite.name}</a></nav>`,
    );
    expect(markup).toContain("<h1>reading</h1>");
    expect(markup).toEndWith("</header>");
    expect(markup.indexOf("<nav")).toBeLessThan(markup.indexOf("<h1>"));
  });
});
