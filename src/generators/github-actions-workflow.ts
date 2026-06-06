import { oneTrailingNewline } from "./format.js";

export function generateGithubActionsWorkflow(): string {
  return oneTrailingNewline(
    [
      "name: ready-for-agents",
      "",
      "on:",
      "  pull_request:",
      "  push:",
      "    branches: [main]",
      "  workflow_dispatch:",
      "",
      "jobs:",
      "  ready-for-agents:",
      "    runs-on: ubuntu-latest",
      "    permissions:",
      "      contents: read",
      "    steps:",
      "      - name: Checkout",
      "        uses: actions/checkout@v4",
      "",
      "      - name: Setup Node.js",
      "        uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "",
      "      - name: Check agent readiness",
      "        run: npx --package ready-for-agents rfa doctor --json --cwd .",
      "",
      "      - name: Check generated context freshness",
      "        run: npx --package ready-for-agents rfa diff --json --cwd .",
    ].join("\n"),
  );
}
