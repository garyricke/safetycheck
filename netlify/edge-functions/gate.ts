// Password gate for the Martam training area.
//
// The password is read from the Netlify environment variable SITE_PASSWORD
// (Site settings → Environment variables). There is NO username — password only.
// The password is never stored in this repo; only a SHA-256 token derived from
// it is placed in an HttpOnly cookie after a correct entry.
//
// Which paths this runs on is controlled in netlify.toml ([[edge_functions]]).
// While the training is in review it protects the whole /martam/* area.
// See README.md "Going live" to make the training page public while keeping
// the internal docs (status.html / vo-script.html) protected.

const COOKIE = "martam_gate";

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
<title>Martam Safety Training &middot; Protected</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Barlow:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
  background:radial-gradient(120% 120% at 50% 0%,#1c1e22 0%,#111214 55%,#0a0b0d 100%);
  font-family:'Barlow',system-ui,sans-serif;color:#ecf0f4}
.box{width:min(400px,92vw);text-align:center;background:rgba(20,21,24,.9);
  border:1px solid rgba(229,35,31,.28);border-radius:18px;padding:44px 38px;
  box-shadow:0 24px 80px rgba(0,0,0,.55)}
img{height:44px;margin:0 auto 22px;display:block}
h1{font-family:'Barlow Condensed',sans-serif;font-weight:600;letter-spacing:.05em;
  font-size:1.7rem;margin:0 0 6px;color:#fff}
.sub,.msg{font-size:.85rem;margin:0 0 22px;color:rgba(236,240,244,.6)}
.msg{color:#ff7a7a}.msg.cfg{color:#ffcf6a}
input{width:100%;padding:13px 16px;background:rgba(0,0,0,.35);border:1px solid rgba(229,35,31,.3);
  border-radius:9px;color:#fff;font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s}
input:focus{border-color:#E5231F}
button{margin-top:14px;width:100%;padding:13px;background:#E5231F;color:#fff;border:0;border-radius:9px;
  font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:1.15rem;letter-spacing:.08em;
  cursor:pointer;transition:background .2s}
button:hover{background:#ff3b36}
.foot{margin-top:20px;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(236,240,244,.32)}
</style></head><body>
<form class="box" method="POST" action="${action}">
  <img src="${logo}" alt="Martam" onerror="this.style.display='none'">
  <h1>Protected Preview</h1>
  ${err}
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus ${configErr ? "disabled" : ""}>
  <button type="submit" ${configErr ? "disabled" : ""}>Enter</button>
  <p class="foot">Martam &middot; SafetyCheck Inc.</p>
</form></body></html>`;
}

export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  // deno-lint-ignore no-explicit-any
  const PASS = (globalThis as any).Netlify?.env?.get("SITE_PASSWORD") ?? "";
  const cookies = request.headers.get("cookie") || "";
  const current = (cookies.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]+)")) || [])[1];

  // Sign out: clear the cookie and show the login screen.
  if (url.searchParams.has("logout")) {
    return new Response(null, {
      status: 302,
      headers: {
        location: url.pathname,
        "set-cookie": `${COOKIE}=; Path=/martam; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  // Password not configured yet → locked, with a clear admin-facing message.
  if (!PASS) {
    return new Response(
      loginPage("Access is not configured yet. Set SITE_PASSWORD in Netlify.", url.pathname, true),
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const token = await sha256hex(PASS);

  // Already unlocked → serve the real page.
  if (current === token) return context.next();

  // Password submitted.
  if (request.method === "POST") {
    const form = await request.formData();
    const entered = String(form.get("password") || "");
    if (entered === PASS) {
      return new Response(null, {
        status: 302,
        headers: {
          location: url.pathname,
          "set-cookie": `${COOKIE}=${token}; Path=/martam; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(loginPage("Incorrect password. Try again.", url.pathname, false), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Not unlocked → show the login screen.
  return new Response(loginPage("", url.pathname, false), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};
