import { installDirectBrowser } from "@hraness/direct/web";
import { createRoot } from "react-dom/client";

import "../app/globals.css";
import { createWebsiteDirectSession } from "./session";
import { WebsiteDirectError, WebsiteDirectWorkbench } from "./workbench";
import "./workbench.css";

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("Personal website Direct root is missing.");
const root = createRoot(rootElement);
const created = createWebsiteDirectSession(globalThis.location.search);

if (!created.ok) {
  root.render(<WebsiteDirectError message={created.error.message} />);
} else {
  const session = created.value;
  const installed = installDirectBrowser({
    session,
    reset: () => {
      globalThis.location.reload();
      return undefined;
    },
    firewall: {
      onActivityError: session.harness.recordActivityFailure,
      onBlocked: session.harness.recordBlockedNetworkRequest,
    },
  });
  if (!installed.ok) {
    session.dispose();
    root.render(<WebsiteDirectError message={installed.error.message} />);
  } else {
    globalThis.addEventListener("pagehide", session.dispose, { once: true });
    root.render(
      <WebsiteDirectWorkbench
        activeScenario={session.activation.scenario}
        harness={session.harness}
      />,
    );
  }
}
