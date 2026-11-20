// Plantilla del correo de contacto. HTML con estilos inline (los clientes de
// correo ignoran <style>/CSS externo), paleta arcade de globals.css.

export type ContactEmailInput = {
  name: string;
  email: string;
  msg: string;
};

export type ContactEmail = { subject: string; html: string; text: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Evita inyección de cabeceras en el asunto (saltos de línea).
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

const MONO = "'JetBrains Mono','Courier New',Courier,monospace";

export function buildContactEmail({
  name,
  email,
  msg,
}: ContactEmailInput): ContactEmail {
  const n = escapeHtml(oneLine(name));
  const e = escapeHtml(oneLine(email));
  // pre-wrap conserva los saltos de línea del mensaje sin permitir HTML.
  const m = escapeHtml(msg);

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#0a0a0f;font-family:${MONO};color:#e6e9ff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0f0f18;border:2px solid #00f5ff;">
    <tr><td style="padding:14px 20px;background:#15151f;border-bottom:2px solid #00f5ff;font-size:12px;letter-spacing:2px;color:#f5ff00;">
      &#9656; ARCADE VAULT // NUEVO MENSAJE
    </td></tr>
    <tr><td style="padding:24px 20px 8px;">
      <div style="font-size:11px;letter-spacing:2px;color:#8a8fb5;">NOMBRE</div>
      <div style="font-size:16px;color:#00ff88;margin:4px 0 16px;">${n}</div>
      <div style="font-size:11px;letter-spacing:2px;color:#8a8fb5;">CORREO</div>
      <div style="font-size:16px;color:#00f5ff;margin:4px 0 16px;">${e}</div>
      <div style="font-size:11px;letter-spacing:2px;color:#8a8fb5;">MENSAJE</div>
      <div style="font-size:14px;line-height:1.6;color:#e6e9ff;margin:8px 0 0;padding:14px;background:#0a0a0f;border-left:3px solid #ff006e;white-space:pre-wrap;word-break:break-word;">${m}</div>
    </td></tr>
    <tr><td style="padding:16px 20px 20px;font-size:11px;color:#4a4f70;">
      Responde a este correo para contestar directamente a ${n}.
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "ARCADE VAULT // NUEVO MENSAJE",
    "",
    `Nombre: ${oneLine(name)}`,
    `Correo: ${oneLine(email)}`,
    "",
    "Mensaje:",
    msg,
  ].join("\n");

  return {
    subject: `[Arcade Vault] Mensaje de ${oneLine(name)}`,
    html,
    text,
  };
}
