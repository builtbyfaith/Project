// Runs automatically on every verified Netlify form submission and emails it via Resend.
// Needs Netlify environment variables: RESEND_API_KEY, NOTIFY_TO (and optional NOTIFY_FROM).
const LABELS = {
  "training-consultation": "free consultation request",
  "creative-call": "creative call request",
  "quiz-signup": "quiz signup"
};
const FIELD_NAMES = {
  name: "Name", email: "Email", phone: "Phone", goal: "Main goal", "best-times": "Best times",
  service: "Service", deadline: "Date or deadline", message: "Message", program: "Matched program", "add-ons": "Add-ons"
};
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

exports.handler = async (event) => {
  let payload;
  try { payload = JSON.parse(event.body || "{}").payload; } catch (e) { return { statusCode: 400, body: "Bad body" }; }
  if (!payload) return { statusCode: 400, body: "No payload" };
  const form = payload.form_name;
  const d = payload.data || {};
  const label = LABELS[form] || "form submission";
  const okEmail = typeof d.email === "string" && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(d.email) && d.email.length < 200;
  const who = String(d.name || (okEmail ? d.email : "") || "someone").replace(/[\r\n]+/g, " ").slice(0, 80);

  const rows = Object.keys(FIELD_NAMES)
    .filter(k => d[k])
    .map(k => `<tr><td style="padding:8px 12px;color:#5E676E;font-weight:600;vertical-align:top;white-space:nowrap">${FIELD_NAMES[k]}</td><td style="padding:8px 12px;color:#1F2A33">${esc(d[k]).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#FAF8F5;border-radius:16px;overflow:hidden">
    <div style="background:#26324A;color:#FFF6F1;padding:18px 22px;font-size:18px;font-weight:700">New ${esc(label)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:15px;margin:10px 0">${rows}</table>
    <p style="padding:0 22px 20px;color:#5E676E;font-size:13px">Reply to this email to answer ${esc(who)} directly. Sent from built-by-faith.com.</p>
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.RESEND_API_KEY },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || "Built by Faith <onboarding@resend.dev>",
      to: [process.env.NOTIFY_TO || "builtbyfaith247@gmail.com"],
      reply_to: okEmail ? d.email : undefined,
      subject: `New ${label} from ${who}`,
      html
    })
  });
  if (!r.ok) {
    console.error("Resend error", r.status, await r.text());
    return { statusCode: 502, body: "Email failed" };
  }
  return { statusCode: 200, body: "Sent" };
};
