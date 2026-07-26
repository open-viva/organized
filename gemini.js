// gemini.js, calls Gemini via the real REST API
// no SDK, just fetch

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// output schema: the model can't invent fields
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    week_label: { type: 'string', description: 'Intervallo della settimana, es. "9 – 15 marzo".' },
    summary: {
      type: 'string',
      description: 'Due frasi sul carico della settimana. Concreto, senza incoraggiamenti.',
    },
    days: {
      type: 'array',
      description: 'Un elemento per ciascuno dei 7 giorni richiesti, anche se vuoto.',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                subject: { type: 'string' },
                subject_id: { type: 'integer', description: 'id materia dal registro, 0 se sconosciuto' },
                minutes: { type: 'integer', description: 'Da 20 a 90, multipli di 15.' },
                topic: { type: 'string', description: 'Cosa studiare, max 90 caratteri.' },
                ref: {
                  type: 'string',
                  description: 'Scadenza collegata, es. "verifica lun 16" o "consegna gio 12". Vuoto se ripasso libero.',
                },
                reason: { type: 'string', description: 'Perché questo blocco esiste. Una frase.' },
                sources: {
                  type: 'array',
                  description: 'Chiavi dei dati usati: grades, agenda, homeworks, lessons, absences, noticeboard.',
                  items: { type: 'string' },
                },
              },
              required: ['subject', 'subject_id', 'minutes', 'topic', 'ref', 'reason', 'sources'],
            },
          },
        },
        required: ['date', 'blocks'],
      },
    },
    rules_applied: {
      type: 'array',
      description: 'Da 3 a 5 criteri realmente usati, in ordine di peso.',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string', description: 'Titolo breve, max 45 caratteri.' },
          detail: { type: 'string', description: 'Una o due frasi con numeri concreti presi dai dati.' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['criterion', 'detail', 'sources'],
      },
    },
    focus: {
      type: 'array',
      description: 'Una riga per materia con almeno un voto.',
      items: {
        type: 'object',
        properties: {
          subject_id: { type: 'integer' },
          subject: { type: 'string' },
          risk: { type: 'string', enum: ['alto', 'medio', 'basso'] },
          minutes_week: { type: 'integer' },
          note: { type: 'string', description: 'Max 70 caratteri.' },
        },
        required: ['subject_id', 'subject', 'risk', 'minutes_week', 'note'],
      },
    },
  },
  required: ['week_label', 'summary', 'days', 'rules_applied', 'focus'],
};

//send the school data, not the identity
const IT_MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const DOW = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export function buildContext(sync, window) {
  const { derived } = sync;

  const inWindow = (d) => d >= window.from && d <= window.to;
  const soon = (d) => d >= window.from && d <= window.plus21;

  return {
    oggi: sync.today,
    settimana: { dal: window.from, al: window.to },
    classe: sync.student.classDesc, // useful for the level, doesn't identify
    // no name, surname, tax code, email, student id, school
    materie: derived.subjects
      .filter((s) => s.count > 0)
      .map((s) => ({
        id: s.subjectId,
        nome: s.subject,
        media: s.average,
        voti: s.count,
        andamento: s.trend,
        ultimi: s.grades.slice(-5).map((g) => ({ data: g.date, voto: g.display, peso: g.weight })),
      })),
    scadenze: derived.tasks.filter((t) => soon(t.date)).map((t) => ({
      data: t.date,
      tipo: t.kind,
      certo: t.certain,
      materia: t.subject,
      materia_id: t.subjectId,
      testo: t.text.slice(0, 240),
      sorgenti: t.sources,
    })),
    argomenti_recenti: derived.topics.map((t) => ({
      materia_id: t.subjectId,
      materia: t.subject,
      lezioni: t.topics.slice(0, 5).map((x) => `${x.date}: ${x.topic}`.slice(0, 140)),
    })),
    ore_scuola_stimate: DOW.map((d, i) => `${d}: ${derived.load[i]}h`),
    assenze_recenti: derived.absences.filter((a) => a.date >= window.minus30).map((a) => a.date),
    circolari_con_azione: derived.notices
      .filter((n) => n.needs.join || n.needs.file || n.needs.sign || n.needs.reply)
      .slice(0, 8)
      .map((n) => ({ titolo: n.title, scade: n.validTo, richiede: n.needs })),
    giorni_richiesti: window.days,
  };
}

const SYSTEM = `Sei il pianificatore di studio di uno studente italiano di scuola superiore.
Ricevi i dati del suo registro elettronico e produci il piano dei prossimi 7 giorni.

Regole non negoziabili:
1. Un blocco dura da 20 a 90 minuti, in multipli di 15. Mai oltre 90: spezza su giorni diversi.
2. Nessun blocco nel giorno stesso di una verifica per quella materia. L'ultima sessione cade il giorno prima.
3. Le materie con media più bassa e verifica vicina ricevono più minuti. La media conta più dell'andamento.
4. I titoli dei blocchi devono citare gli argomenti reali delle lezioni firmate dai docenti, non capitoli inventati.
5. Alleggerisci i giorni con molte ore di scuola. La domenica: massimo 30 minuti totali, solo ripasso.
6. Le lezioni perse per assenza diventano argomenti da recuperare, con priorità.
7. Totale settimanale tra 6 e 12 ore, distribuito su almeno 5 giorni.
8. Se una scadenza ha certo=false è stata dedotta dal testo, non dichiarata dal docente: trattala come probabile e dillo nel reason.
9. Ogni blocco elenca in sources solo i dati che hai davvero usato.
10. Italiano. Nessun incoraggiamento, nessun "ricorda di", nessuna emoji.

Restituisci solo JSON conforme allo schema.`;

// tolerant text extraction from the response
function extractText(payload) {
  const cand = payload?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('');
  if (cand) return cand;

  //fallback: walk the payload in case the shape ever changes
  const parts = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node.text === 'string') parts.push(node.text);
    for (const k of ['content', 'parts', 'candidates']) walk(node[k]);
  };
  walk(payload);
  if (parts.length) return parts.join('');

  throw new Error('Risposta del modello senza testo utilizzabile.');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Il modello non ha restituito JSON valido.');
    return JSON.parse(m[0]);
  }
}

// api call
export async function generatePlan(sync, { now = new Date(), timeoutMs = 30000 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY non configurata.'), { code: 'NO_KEY' });

  const window = buildWindow(now);
  const context = buildContext(sync, window);

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `Dati del registro (JSON):\n${JSON.stringify(context)}\n\n` +
              `Pianifica esattamente questi giorni: ${window.days.join(', ')}. ` +
              `week_label deve essere in italiano, formato "${window.label}".`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: PLAN_SCHEMA,
    },
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const t0 = Date.now();

  let res;
  try {
    res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = payload?.error?.message || `Gemini ha risposto ${res.status}`;
    const code = res.status === 429 ? 'RATE_LIMIT' : res.status === 403 ? 'BAD_KEY' : 'MODEL_ERROR';
    throw Object.assign(new Error(msg), { code, status: res.status });
  }

  // safety/recitation blocks: no candidates, but 200 OK
  if (!payload?.candidates?.length) {
    const reason = payload?.promptFeedback?.blockReason || 'nessuna candidata restituita';
    throw Object.assign(new Error(`Gemini non ha prodotto una risposta (${reason}).`), { code: 'EMPTY_RESPONSE' });
  }

  const plan = parseJson(extractText(payload));
  const usage = payload?.usageMetadata || {};

  return {
    plan: sanitize(plan, window),
    meta: {
      model: MODEL,
      latencyMs: Date.now() - t0,
      inputTokens: usage.promptTokenCount ?? null,
      outputTokens: usage.candidatesTokenCount ?? null,
      generatedAt: new Date().toISOString(),
      contextBytes: JSON.stringify(context).length,
    },
  };
}

// 7-day window

export function buildWindow(now = new Date()) {
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const back = (n) => {
    const d = new Date(d0);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const fwd = (n) => {
    const d = new Date(d0);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const a = new Date(days[0]);
  const b = new Date(days[6]);
  const label =
    a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} ${IT_MONTHS[b.getMonth()]}`
      : `${a.getDate()} ${IT_MONTHS[a.getMonth()]} – ${b.getDate()} ${IT_MONTHS[b.getMonth()]}`;

  return { days, from: days[0], to: days[6], label, minus30: back(30), plus21: fwd(21) };
}

// server-side guardrail: schema alone isn't enough

function sanitize(plan, window) {
  const byDate = new Map((plan.days || []).map((d) => [d.date, d]));
  const days = window.days.map((date) => {
    const src = byDate.get(date) || { date, blocks: [] };
    const isSunday = new Date(date).getDay() === 0;
    let blocks = (src.blocks || [])
      .map((b) => ({
        ...b,
        minutes: Math.max(20, Math.min(90, Math.round((Number(b.minutes) || 30) / 15) * 15)),
        topic: String(b.topic || '').slice(0, 120),
        sources: Array.isArray(b.sources) ? b.sources.slice(0, 4) : [],
      }))
      .slice(0, 4);
    if (isSunday) {
      // rule 5 enforced downstream: sunday stays light even if the model ignores it
      blocks = blocks.slice(0, 1).map((b) => ({ ...b, minutes: Math.min(30, b.minutes) }));
    }
    return { date, blocks };
  });

  const total = days.reduce((s, d) => s + d.blocks.reduce((x, b) => x + b.minutes, 0), 0);

  return {
    week_label: String(plan.week_label || window.label),
    summary: String(plan.summary || '').slice(0, 400),
    days,
    rules_applied: (plan.rules_applied || []).slice(0, 5),
    focus: (plan.focus || []).map((f) => ({
      ...f,
      risk: ['alto', 'medio', 'basso'].includes(f.risk) ? f.risk : 'basso',
    })),
    totals: { minutes: total, days: days.filter((d) => d.blocks.length).length },
  };
}

export { MODEL, PLAN_SCHEMA };
