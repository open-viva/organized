// classeviva rest client, read-only, endpoints from github.com/open-viva/endpoints

const AUTH = 'https://web.spaggiari.eu/auth-p7/app/default/AuthApi4.php?a=aLoginPwd';
const REST = 'https://web.spaggiari.eu/rest/w1';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// cookie jar

function setCookieList(res) {
  if (typeof res.headers.getSetCookie === 'function') return res.headers.getSetCookie();
  const one = res.headers.get('set-cookie');
  return one ? [one] : [];
}

function absorb(jar, res) {
  for (const line of setCookieList(res)) {
    const [pair] = line.split(';');
    const i = pair.indexOf('=');
    if (i < 1) continue;
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (!value || value === 'deleted') jar.delete(name);
    else jar.set(name, value);
  }
  return jar;
}

const header = (jar) => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

// login

export async function login({ uid, pwd, cid = '', pin = '', target = 'studenti' }) {
  if (!uid || !pwd) throw new Error('Servono username e password del registro.');

  const body = new URLSearchParams({ uid, pwd, cid, pin, target });
  const res = await fetch(AUTH, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': UA,
      accept: '*/*',
    },
    body,
  });

  const jar = absorb(new Map(), res);
  const text = await res.text().catch(() => '');

  if (!jar.has('PHPSESSID') || !jar.has('webidentity')) {
    // spaggiari returns 200 even on wrong credentials, check cookies instead
    const hint = /pwd|password|credenziali|errat/i.test(text)
      ? 'Credenziali rifiutate dal registro.'
      : `Login non riuscito (HTTP ${res.status}).`;
    throw Object.assign(new Error(hint), { code: 'AUTH_FAILED' });
  }

  return {
    jar,
    identity: jar.get('webidentity'),
    role: jar.get('webrole') || null,
    openedAt: Date.now(),
  };
}

// generic get

async function get(session, path) {
  const res = await fetch(`${REST}/${path.replace(/^\/+/, '')}`, {
    headers: {
      cookie: header(session.jar),
      'user-agent': UA,
      accept: 'application/json, text/plain, */*',
      'z-dev-apikey': 'Tg1NWEwNGIgIC0K',
    },
  });

  absorb(session.jar, res);

  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error('Sessione scaduta: serve un nuovo login.'), {
      code: 'SESSION_EXPIRED',
      path,
    });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status} su ${path}`), { code: 'HTTP', path });
  }
  return res.json();
}

// school year

export function schoolYear(annoScol, now = new Date()) {
  let start, end;
  const m = /^(\d{4})\/(\d{2})$/.exec(annoScol || '');
  if (m) {
    start = Number(m[1]);
    end = 2000 + Number(m[2]);
  } else {
    const y = now.getFullYear();
    start = now.getMonth() + 1 >= 9 ? y : y - 1;
    end = start + 1;
  }
  return {
    label: `${start}/${String(end).slice(2)}`,
    start,
    end,
    from: `${start}0901`,
    to: `${end}0831`,
    gradesPath: `grades${String(end).slice(2)}`,
  };
}

const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const iso = (d) => ymd(d).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

// tasks: two sources merged
// A) agenda event, evtCode AGHW/AGNT   B) homeworks/index entry
// same task often appears in both (the event carries a homeworkId)

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const HW_RE = /\b(compit|esercizi|studiare|studio|ripass|pag\.?|pagine|es\.?\s*\d|consegn|relazione|traduzione|tema)\b/i;
const TEST_RE = /\b(verific|compito in classe|prova|test|interrogazion|orale|simulazion|questionario)\b/i;

function fromAgenda(raw) {
  return (raw?.agenda || []).map((e) => {
    const text = String(e.notes || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const date = String(e.evtDatetimeBegin || '').slice(0, 10);
    const explicitHomework = e.evtCode === 'AGHW' || e.homeworkId != null;
    const kind = explicitHomework ? 'compito' : TEST_RE.test(text) ? 'verifica' : HW_RE.test(text) ? 'compito' : 'evento';
    return {
      key: `ag:${e.evtId}`,
      kind,
      certain: explicitHomework || e.evtCode === 'AGHW',
      date,
      startAt: e.evtDatetimeBegin || null,
      endAt: e.evtDatetimeEnd || null,
      fullDay: !!e.isFullDay,
      subjectId: e.subjectId ?? null,
      subject: e.subjectDesc || null,
      author: e.authorName || null,
      text,
      homeworkId: e.homeworkId ?? null,
      sources: ['agenda'],
    };
  });
}

function fromHomeworks(raw) {
  const items = raw?.items || raw?.homeworks || [];
  return items.map((h, i) => {
    const id = h.homeworkId ?? h.id ?? h.evtId ?? `i${i}`;
    const date = String(
      h.dueDate || h.evtDate || h.date || h.expireDate || h.datetimeDelivery || ''
    ).slice(0, 10);
    const text = String(h.description || h.notes || h.text || h.title || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      key: `hw:${id}`,
      kind: 'compito',
      certain: true,
      date,
      startAt: null,
      endAt: null,
      fullDay: true,
      subjectId: h.subjectId ?? null,
      subject: h.subjectDesc || h.subject || null,
      author: h.authorName || h.teacherName || null,
      text,
      homeworkId: id,
      attachments: h.attachments || [],
      sources: ['homeworks'],
    };
  });
}

export function mergeTasks(agendaRaw, homeworksRaw) {
  const a = fromAgenda(agendaRaw);
  const h = fromHomeworks(homeworksRaw);
  const out = [...a];

  const byHomeworkId = new Map();
  for (const it of out) if (it.homeworkId != null) byHomeworkId.set(String(it.homeworkId), it);

  for (const hw of h) {
    // strong match: agenda event references the same homeworkId
    const strong = byHomeworkId.get(String(hw.homeworkId));
    if (strong) {
      strong.sources = ['agenda', 'homeworks'];
      strong.kind = 'compito';
      strong.certain = true;
      if (!strong.text && hw.text) strong.text = hw.text;
      if (hw.attachments?.length) strong.attachments = hw.attachments;
      continue;
    }
    // weak match: same date, same subject, near-identical text
    const weak = out.find(
      (x) =>
        x.date === hw.date &&
        (x.subjectId ?? null) === (hw.subjectId ?? null) &&
        norm(x.text).slice(0, 40) === norm(hw.text).slice(0, 40) &&
        norm(hw.text).length > 6
    );
    if (weak) {
      weak.sources = [...new Set([...weak.sources, 'homeworks'])];
      weak.kind = 'compito';
      weak.certain = true;
      continue;
    }
    out.push(hw);
  }

  return out
    .filter((t) => t.date)
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

// grades and trend

export function subjectStats(gradesRaw, subjectsRaw) {
  const subjects = subjectsRaw?.subjects || [];
  const grades = (gradesRaw?.grades || []).filter(
    (g) => !g.canceled && !g.noAverage && typeof g.decimalValue === 'number'
  );

  const byId = new Map();
  subjects.forEach((s, i) =>
    byId.set(s.id, {
      subjectId: s.id,
      subject: s.description,
      order: s.order ?? i,
      teachers: (s.teachers || []).map((t) => t.teacherName).filter(Boolean),
      grades: [],
    })
  );

  for (const g of grades) {
    let row = byId.get(g.subjectId);
    if (!row) {
      row = { subjectId: g.subjectId, subject: g.subjectDesc, order: 999, teachers: [], grades: [] };
      byId.set(g.subjectId, row);
    }
    row.grades.push({
      date: g.evtDate,
      value: g.decimalValue,
      display: g.displayValue,
      weight: g.weightFactor || 1,
      period: g.periodDesc,
      component: g.componentDesc,
      teacher: g.teacherName,
      note: g.notesForFamily || '',
      code: g.subjectCode || null,
    });
  }

  const rows = [...byId.values()].map((r) => {
    r.grades.sort((a, b) => (a.date < b.date ? -1 : 1));
    const w = r.grades.reduce((s, g) => s + g.weight, 0);
    const avg = w ? r.grades.reduce((s, g) => s + g.value * g.weight, 0) / w : null;
    const last3 = r.grades.slice(-3);
    const prev3 = r.grades.slice(-6, -3);
    const mean = (a) => (a.length ? a.reduce((s, g) => s + g.value, 0) / a.length : null);
    const trend = last3.length && prev3.length ? mean(last3) - mean(prev3) : 0;
    return {
      ...r,
      code: r.grades.at(-1)?.code || null,
      average: avg == null ? null : Math.round(avg * 100) / 100,
      count: r.grades.length,
      trend: Math.round(trend * 100) / 100,
      lastGrade: r.grades.at(-1) || null,
    };
  });

  rows.sort((a, b) => a.order - b.order);
  return rows;
}

// estimated daily load: signed lessons are past only, average of last 4 weeks per weekday

export function weeklyLoad(lessonsRaw, now = new Date()) {
  const cut = new Date(now);
  cut.setDate(cut.getDate() - 28);
  const perDay = new Map();
  for (const l of lessonsRaw?.lessons || []) {
    const d = new Date(l.evtDate);
    if (isNaN(d) || d < cut || d > now) continue;
    const k = `${l.evtDate}`;
    perDay.set(k, (perDay.get(k) || 0) + (l.evtDuration || 1));
  }
  const buckets = [[], [], [], [], [], [], []];
  for (const [date, hours] of perDay) buckets[new Date(date).getDay()].push(hours);
  return buckets.map((h) =>
    h.length ? Math.round((h.reduce((a, b) => a + b, 0) / h.length) * 10) / 10 : 0
  );
}

export function recentTopics(lessonsRaw, days = 30, now = new Date()) {
  const cut = new Date(now);
  cut.setDate(cut.getDate() - days);
  const map = new Map();
  for (const l of lessonsRaw?.lessons || []) {
    const arg = String(l.lessonArg || '').replace(/\s+/g, ' ').trim();
    if (!arg) continue;
    const d = new Date(l.evtDate);
    if (isNaN(d) || d < cut) continue;
    const k = l.subjectId ?? l.subjectDesc;
    if (!map.has(k)) map.set(k, { subjectId: l.subjectId ?? null, subject: l.subjectDesc, topics: [] });
    map.get(k).topics.push({ date: l.evtDate, topic: arg });
  }
  for (const v of map.values()) {
    v.topics.sort((a, b) => (a.date < b.date ? 1 : -1));
    v.topics = v.topics.slice(0, 8);
  }
  return [...map.values()];
}

// full sync

export async function fetchAll(session, { now = new Date() } = {}) {
  const whoami = await get(session, 'misc/whoami');
  const id = whoami.id;
  const year = schoolYear(whoami.anno_scol, now);

  const plan = [
    ['subjects', `students/${id}/subjects`],
    ['grades', `students/${id}/${year.gradesPath}`],
    ['agenda', `students/${id}/agendav2/all/${year.from}/${year.to}`],
    ['homeworks', `students/${id}/homeworks/index`],
    ['lessons', `students/${id}/lessons/${year.from}/${ymd(now)}`],
    ['absences', `students/${id}/absences/details/`],
    ['noticeboard', `students/${id}/noticeboard`],
    ['didactics', `students/${id}/didactics`],
    ['schoolbooks', `students/${id}/schoolbooks/index`],
    ['notes', `students/${id}/notes/all/`],
    ['minister', `noticeboarduser/${id}/communications_minister`],
  ];

  const raw = { whoami };
  const sources = [{ key: 'whoami', path: 'misc/whoami', status: 'ok', count: 1 }];

  const settled = await Promise.allSettled(plan.map(([, p]) => get(session, p)));
  settled.forEach((r, i) => {
    const [key, path] = plan[i];
    if (r.status === 'fulfilled') {
      raw[key] = r.value;
      const arr = Object.values(r.value).find(Array.isArray);
      const count = Array.isArray(arr)
        ? arr.length
        : Object.values(r.value).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
      sources.push({ key, path, status: count ? 'ok' : 'empty', count });
    } else {
      raw[key] = null;
      sources.push({ key, path, status: 'error', count: 0, error: r.reason?.message || 'errore' });
    }
  });

  // grades for current year missing (different school year), retry with previous year
  if (!raw.grades) {
    const alt = `students/${id}/grades${String(year.end - 1).slice(2)}`;
    try {
      raw.grades = await get(session, alt);
      const s = sources.find((x) => x.key === 'grades');
      Object.assign(s, { path: alt, status: 'ok', count: raw.grades.grades?.length || 0, error: null });
    } catch {}
  }

  const tasks = mergeTasks(raw.agenda, raw.homeworks);

  return {
    student: {
      firstName: whoami.nome,
      lastName: whoami.cognome,
      classDesc: whoami.classe_desc || whoami.classe_ident,
      year: year.label,
      accountType: whoami.account_type,
    },
    year,
    sources,
    raw,
    derived: {
      tasks,
      subjects: subjectStats(raw.grades, raw.subjects),
      load: weeklyLoad(raw.lessons, now),
      topics: recentTopics(raw.lessons, 30, now),
      absences: (raw.absences?.events || []).map((e) => ({
        date: e.evtDate,
        code: e.evtCode,
        justified: !!e.isJustified,
        reason: e.justifReasonDesc || null,
      })),
      notices: (raw.noticeboard?.items || []).map((n) => ({
        pubId: n.pubId,
        cntId: n.cntId,
        evtCode: n.evtCode,
        date: String(n.pubDT || '').slice(0, 10),
        validTo: n.cntValidTo || null,
        title: n.cntTitle,
        category: n.cntCategory,
        read: !!n.readStatus,
        needs: {
          join: !!n.needJoin,
          reply: !!n.needReply,
          file: !!n.needFile,
          sign: !!n.needSign,
        },
        attachments: (n.attachments || []).map((a) => a.fileName),
      })),
    },
    syncedAt: new Date().toISOString(),
    today: iso(now),
  };
}

// reads a notice's text (also marks it read on the register side)
export async function readNotice(session, { evtCode, pubId, cntId }) {
  const id = session.studentId;
  return get(session, `students/${id}/noticeboard/readmulti/${evtCode}/${pubId}/${cntId}`);
}

export { iso, ymd, header as cookieHeader };
