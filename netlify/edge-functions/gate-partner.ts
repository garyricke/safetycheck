// Password gate for the Orbis × SafetyCheck partner / pitch kit (/partner/*).
//
// Identical mechanism to gate.ts, but reads its OWN password from the
// PARTNER_PASSWORD environment variable (Netlify → Site settings → Environment
// variables) so the partner area can use a different password than the Martam
// training. Password only, no username. The password is never stored in this
// repo — only a SHA-256 token derived from it is placed in an HttpOnly cookie.
//
// Which paths this runs on is controlled in netlify.toml ([[edge_functions]]).

const COOKIE = "partner_gate";

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loginPage(message: string, action: string, configErr: boolean): string {
  const logo = "https://res.cloudinary.com/dsbllwpbh/image/upload/martam-safety/logo-martam-whtk.svg";
  const err = message
    ? `<p class="msg${configErr ? " cfg" : ""}">${message}</p>`
    : `<p class="sub">Enter the password to continue.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Safety Check &middot; Partner Preview</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Lato:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
  background:radial-gradient(120% 120% at 50% 0%,#1c2a2f 0%,#141b1e 55%,#0b1013 100%);
  font-family:'Lato',system-ui,sans-serif;color:#eafaf6}
.box{width:min(410px,92vw);text-align:center;background:rgba(20,24,26,.9);
  border:1px solid rgba(26,188,156,.3);border-radius:18px;padding:44px 38px;
  box-shadow:0 24px 80px rgba(0,0,0,.55)}
.mark{font-family:'Poppins',sans-serif;font-weight:700;letter-spacing:.13em;font-size:1.25rem;color:#fff;text-transform:uppercase;margin-bottom:6px}
.mark span{color:#1ABC9C}
h1{font-family:'Poppins',sans-serif;font-weight:600;letter-spacing:.02em;
  font-size:1.35rem;margin:14px 0 6px;color:#fff}
.sub,.msg{font-size:.85rem;margin:0 0 22px;color:rgba(234,250,246,.6)}
.msg{color:#ff7a7a}.msg.cfg{color:#ffcf6a}
input{width:100%;padding:13px 16px;background:rgba(0,0,0,.35);border:1px solid rgba(26,188,156,.3);
  border-radius:9px;color:#fff;font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s}
input:focus{border-color:#1ABC9C}
button{margin-top:14px;width:100%;padding:13px;background:#1ABC9C;color:#fff;border:0;border-radius:9px;
  font-family:'Poppins',sans-serif;font-weight:600;font-size:1.05rem;letter-spacing:.04em;
  cursor:pointer;transition:background .2s}
button:hover{background:#15a488}
.foot{margin-top:20px;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(234,250,246,.32)}
</style></head><body>
<form class="box" method="POST" action="${action}">
  <div class="mark">SAFET<span>&#10003;</span>CHECK</div>
  <h1>Partner Preview</h1>
  ${err}
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus ${configErr ? "disabled" : ""}>
  <button type="submit" ${configErr ? "disabled" : ""}>Enter</button>
  <p class="foot">Safety Check Inc. &middot; Orbis Design</p>
</form></body></html>`;
}

export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  // deno-lint-ignore no-explicit-any
  const PASS = (globalThis as any).Netlify?.env?.get("PARTNER_PASSWORD") ?? "";
  const cookies = request.headers.get("cookie") || "";
  const current = (cookies.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]+)")) || [])[1];

  if (url.searchParams.has("logout")) {
    return new Response(null, {
      status: 302,
      headers: {
        location: url.pathname,
        "set-cookie": `${COOKIE}=; Path=/partner; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (!PASS) {
    return new Response(
      loginPage("Access is not configured yet. Set PARTNER_PASSWORD in Netlify.", url.pathname, true),
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const token = await sha256hex(PASS);
  if (current === token) return context.next();

  if (request.method === "POST") {
    const form = await request.formData();
    const entered = String(form.get("password") || "");
    if (entered === PASS) {
      return new Response(null, {
        status: 302,
        headers: {
          location: url.pathname,
          "set-cookie": `${COOKIE}=${token}; Path=/partner; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(loginPage("Incorrect password. Try again.", url.pathname, false), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(loginPage("", url.pathname, false), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};
