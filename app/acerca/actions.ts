"use server";

import { Resend } from "resend";
import { buildContactEmail } from "@/lib/contact-email";

export type ContactInput = {
  name: string; // máx. 80
  email: string; // máx. 254, formato válido
  msg: string; // máx. 2000
  website?: string; // honeypot: debe venir vacío
};

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

const GENERIC_ERROR = "NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO.";

export async function sendContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  // Una Server Action es alcanzable por POST directo: no confiar en el tipo.
  const raw = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const name = str(raw.name).trim();
  const email = str(raw.email).trim();
  const msg = str(raw.msg).trim();
  const website = str(raw.website);

  // Honeypot: éxito simulado, sin enviar nada.
  if (website.trim() !== "") {
    return { ok: true, name: name || "JUGADOR" };
  }

  if (!name || !email || !msg) {
    return { ok: false, error: "COMPLETA TODOS LOS CAMPOS." };
  }
  if (name.length > MAX_NAME) {
    return { ok: false, error: `EL NOMBRE NO PUEDE PASAR DE ${MAX_NAME} CARACTERES.` };
  }
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return { ok: false, error: "EL CORREO NO ES VÁLIDO." };
  }
  if (msg.length > MAX_MSG) {
    return { ok: false, error: `EL MENSAJE NO PUEDE PASAR DE ${MAX_MSG} CARACTERES.` };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error(
      "[contacto] Faltan variables de entorno RESEND_API_KEY o CONTACT_TO_EMAIL",
    );
    return { ok: false, error: GENERIC_ERROR };
  }

  const { subject, html, text } = buildContactEmail({ name, email, msg });

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to,
      replyTo: email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[contacto] Resend devolvió error:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[contacto] Fallo al enviar con Resend:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true, name };
}
