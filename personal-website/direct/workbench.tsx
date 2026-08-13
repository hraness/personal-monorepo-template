import { SCENARIO_QUERY_KEY } from "@hraness/direct";

import { PersonalHomepage } from "../src/personal-homepage";
import { DETERMINISTIC_APPEARANCE_MARKER } from "./deterministic-appearance-port";
import { websiteDirectDefinition } from "./scenarios";
import type { WebsiteDirectHarness } from "./session";

function scenarioHref(id: string): string {
  const url = new URL("/direct/", globalThis.location.origin);
  url.searchParams.set(SCENARIO_QUERY_KEY, id);
  return `${url.pathname}${url.search}`;
}

export function WebsiteDirectWorkbench(props: Readonly<{
  activeScenario: string;
  harness: WebsiteDirectHarness;
}>) {
  const active = websiteDirectDefinition.scenarios.resolve(props.activeScenario);
  if (!active.ok) throw new Error(active.error.message);

  return (
    <main className="workbench-shell" data-appearance-adapter={DETERMINISTIC_APPEARANCE_MARKER}>
      <aside className="workbench-sidebar">
        <header>
          <p>deterministic development</p>
          <h1>personal website</h1>
          <span>Real homepage, in-memory appearance port, network blocked.</span>
        </header>
        <nav aria-label="Personal website scenarios">
          {websiteDirectDefinition.scenarios.list().map((scenario) => (
            <a
              aria-current={scenario.id === props.activeScenario ? "page" : undefined}
              href={scenarioHref(scenario.id)}
              key={scenario.id}
            >
              <strong>{scenario.title}</strong>
              <small>{scenario.description}</small>
            </a>
          ))}
        </nav>
        <details>
          <summary>{websiteDirectDefinition.coverage.size} coverage claims</summary>
          <ul>
            {websiteDirectDefinition.coverage.list().map((entry) => (
              <li key={entry.key}><strong>{entry.mode}</strong> {entry.claim}</li>
            ))}
          </ul>
        </details>
      </aside>
      <section className="workbench-stage" aria-label={`${active.value.title} scenario`}>
        <header>
          <p>{active.value.id}</p>
          <h2>{active.value.title}</h2>
          <span>{active.value.description}</span>
        </header>
        <div className="workbench-frame">
          <PersonalHomepage
            appearance={props.harness.appearance}
            content={props.harness.content}
          />
        </div>
      </section>
    </main>
  );
}

export function WebsiteDirectError({ message }: Readonly<{ message: string }>) {
  return (
    <main className="workbench-error" role="alert">
      <p>activation rejected</p>
      <h1>Personal website Direct could not start</h1>
      <span>{message}</span>
      <a href={scenarioHref("homepage.light")}>Open the default scenario</a>
    </main>
  );
}
