"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { sendContactMessage } from "@/app/acerca/actions";

const EMPTY = { name: "", email: "", msg: "", website: "" };

// Formulario de contacto: valida en cliente (UX) y envía por Server Action
// (Resend). El estado vive solo en React; nada se guarda en localStorage.
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doShake = () => {
    setShake(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShake(false), 400);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setError(null);
      doShake();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await sendContactMessage(form);
        if (res.ok) {
          setSent(res.name);
        } else {
          setError(res.error);
          doShake();
        }
      } catch {
        setError("NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO.");
        doShake();
      }
    });
  };

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      onSubmit={onSubmit}
      noValidate
    >
      {!sent ? (
        <>
          <div className="field">
            <label htmlFor="c-name">NOMBRE</label>
            <input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="c-email">CORREO ELECTRÓNICO</label>
            <input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="c-msg">MENSAJE</label>
            <textarea
              id="c-msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          {/* Honeypot: invisible para personas, los bots lo rellenan. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="c-website">NO RELLENAR</label>
            <input
              id="c-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          {error && (
            <div className="contact-error" role="alert">
              &gt; ERROR: {error}
            </div>
          )}
          <button
            className="btn xl press"
            type="submit"
            disabled={pending}
            style={{ width: "100%" }}
          >
            {pending ? "▶ ENVIANDO…" : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {sent.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setSent(null);
                  setForm(EMPTY);
                }}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
