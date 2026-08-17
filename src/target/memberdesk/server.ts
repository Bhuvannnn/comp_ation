import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";

export const MEMBERS: Record<string, { name: string; savings: string; permission: boolean }> = {
  "12345": { name: "Alex Rivera", savings: "$1,284.50", permission: true },
  "99999": { name: "Hidden Member", savings: "$9.00", permission: false },
};

function html(body: string, title = "MemberDesk"): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: "Times New Roman", serif; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    td { border: 1px solid #333; padding: 8px; }
    .t1 { background: #e8e0c8; }
    iframe { width: 100%; height: 180px; border: 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function parseUrl(req: IncomingMessage, host: string, port: number): URL {
  return new URL(req.url ?? "/", `http://${host}:${port}`);
}

export function handleMemberDesk(url: URL, res: ServerResponse): void {
  const fault = url.searchParams.get("fault");
  if (url.pathname === "/fault/slow") {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html("<p>Slow load complete</p>"));
    }, 2500);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/search") {
    if (url.searchParams.get("empty") === "1") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html(`<p>Results frame (empty)</p>`, "Results"));
      return;
    }
    const q = url.searchParams.get("memberId");
    if (!q) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        html(`
<table class="t1"><tr><td>
  <h1>MemberDesk</h1>
  <form action="/search" method="get">
    <label>Member ID <input name="memberId" aria-label="Member ID"></label>
    <button type="submit">Look up</button>
  </form>
  <p>Legacy servicing console. No test IDs. Frames below.</p>
  <iframe src="/search?empty=1" title="results"></iframe>
</td></tr></table>`),
      );
      return;
    }
    if (fault === "interstitial" || q === "88888") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        html(`
<div role="dialog" aria-label="Session notice">
  <p>Session notice: please acknowledge to continue.</p>
  <form action="/search" method="get">
    <input type="hidden" name="memberId" value="${q}">
    <button type="submit" aria-label="Dismiss">Dismiss</button>
  </form>
</div>`),
      );
      return;
    }
    // Deterministic unexpected confirmation (not a known recoverable).
    if (fault === "unexpected" || q === "77777") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        html(`
<div role="dialog" aria-label="Unexpected confirmation">
  <p>Confirm sub-account transfer? This action cannot be undone.</p>
  <button type="button">Confirm</button>
  <button type="button">Cancel</button>
</div>`),
      );
      return;
    }
    const member = MEMBERS[q];
    if (!member) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html(`<h1>Search</h1><p role="status">No such member</p>`, "Search"));
      return;
    }
    if (!member.permission) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html(`<h1>Search</h1><p role="status">Access denied</p>`, "Search"));
      return;
    }
    res.writeHead(302, { location: `/member?id=${q}` });
    res.end();
    return;
  }

  if (url.pathname === "/member") {
    const id = url.searchParams.get("id") ?? "";
    const member = MEMBERS[id];
    if (!member) {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(html("<p>Missing</p>"));
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(
      html(
        `<table class="t1">
          <tr><td><h1>Member ${id}</h1>
          <p>${member.name}</p>
          <p role="status" aria-label="Savings balance">Savings balance ${member.savings}</p>
          <p><a href="/confirm?id=${id}">Open sub-account confirmation</a></p>
          </td></tr>
        </table>`,
        `Member ${id}`,
      ),
    );
    return;
  }

  if (url.pathname === "/confirm") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(html("<h1>Confirmation</h1><p>Review only. No funds moved.</p>", "Confirmation"));
    return;
  }

  res.writeHead(404, { "content-type": "text/html" });
  res.end(html("<p>Not found</p>"));
}

export function startMemberDesk(host = "127.0.0.1", port = 4173): Promise<Server> {
  const server = createServer((req, res) => {
    const addr = server.address();
    const boundPort =
      typeof addr === "object" && addr && "port" in addr ? addr.port : port;
    const url = parseUrl(req, host, boundPort);
    handleMemberDesk(url, res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}

/** Bound listen port (supports `port: 0` ephemeral binds in tests). */
export function memberDeskPort(server: Server): number {
  const addr = server.address();
  if (typeof addr === "object" && addr && "port" in addr) return addr.port;
  throw new Error("MemberDesk server has no bound port");
}

const isMain = process.argv[1]?.includes("memberdesk/server");
if (isMain) {
  const port = Number(process.env.MEMBERDESK_PORT ?? 4173);
  const host = process.env.MEMBERDESK_HOST ?? "127.0.0.1";
  startMemberDesk(host, port).then(() => {
    console.log(`MemberDesk http://${host}:${port}`);
  });
}
