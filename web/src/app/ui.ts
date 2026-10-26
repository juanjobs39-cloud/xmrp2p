/**
 * Utilidades de interfaz compartidas por la app del taker y la del maker:
 * botones con estado de carga (sin dobles clics), etapas del swap y avisos de atención.
 */

/**
 * Pone un botón en estado "cargando": desactivado, con spinner y `aria-busy`.
 * Devuelve la función que lo restaura. Si `el` no es un botón, no hace nada.
 */
export function startLoading(el: Element | null | undefined, label: string): () => void {
  if (!(el instanceof HTMLButtonElement)) return () => {};
  const prev = el.textContent ?? "";
  el.disabled = true;
  el.setAttribute("aria-busy", "true");
  el.classList.add("loading");
  el.textContent = label;
  return () => {
    el.disabled = false;
    el.removeAttribute("aria-busy");
    el.classList.remove("loading");
    // Si mientras tanto otro código cambió el texto (p. ej. el botón de acción), se respeta.
    if (el.textContent === label) el.textContent = prev;
  };
}

export const STAGES = ["step-start", "step-recovery", "step-deposit", "step-progress", "done"] as const;
export type Stage = (typeof STAGES)[number];

/** Marca la etapa actual en el indicador `#stepper` (las anteriores quedan como hechas). */
export function setStage(stage: Stage): void {
  const idx = STAGES.indexOf(stage);
  for (const li of document.querySelectorAll<HTMLElement>("#stepper [data-stage]")) {
    const i = STAGES.indexOf(li.dataset.stage as Stage);
    li.classList.toggle("done", i < idx || stage === "done");
    if (i === idx && stage !== "done") li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  }
}

/**
 * Llama la atención del usuario cuando la app necesita que actúe: título de la pestaña
 * parpadeando y un pitido corto. Devuelve la función que lo detiene.
 */
export function attention(message: string): () => void {
  const original = document.title;
  let on = false;
  const blink = setInterval(() => {
    on = !on;
    document.title = on ? `⚠️ ${message}` : original;
  }, 1000);
  beep();
  return () => {
    clearInterval(blink);
    document.title = original;
  };
}

function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (const [at, freq] of [[0, 880], [0.25, 660]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.2);
    }
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* sin audio: basta el aviso visual */
  }
}
