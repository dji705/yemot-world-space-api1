import { createHash } from 'node:crypto';
function sendYemot(res, text, options = {}) {
  const { inputName = 'wm_nav', min = 1, max = 1, timeout = '5', inputType = 'Digits' } = options;
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const safe = String(text)
    .replace(/[\r\n]+/g, ' ')
    .replace(/(\d)\.(\d)/g, '$1 נקודה $2')
    .replace(/[.=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  res.end(`read=t-${safe}=${inputName},no,${max},${min},${timeout},${inputType},no,no,,,1,Ok`);
}
function val(url, names) {
  for (const n of names) {
    const v = url.searchParams.get(n);
    if (v !== null && v !== '') return v.trim();
  }
  return '';
}
function esc(v) { return String(v ?? '').replace(/[<>]/g, ' '); }
function number(v) { return Number(v).toLocaleString('he-IL'); }
function menu() {
  return 'ברוכים הבאים למרכז מידע עולם וחלל. לשיאים עולמיים הקישו 1. לשיגורי חלל קרובים הקישו 2. למידע על מדינה הקישו 3. לעובדה מעניינת על מספר הקישו 4. למידע על מעברי לוויינים הקישו 5. לרעידות אדמה בעולם הקישו 6. למיקום תחנת החלל הקישו 7. לחיפוש שיאי גינס לפי מדינה הקישו 8.';
}
function worldRecords() {
  const records = [
    'ההר הגבוה בעולם הוא הר אוורסט, שגובהו כ 8,849 מטרים מעל פני הים.',
    'האוקיינוס הגדול בעולם הוא האוקיינוס השקט, ששטחו כ 165 מיליון קילומטרים רבועים.',
    'הנהר הארוך בעולם נחשב לנילוס, שאורכו כ 6,650 קילומטרים. יש מדידות שמעניקות את התואר לאמזונס.',
    'המדינה הגדולה בעולם לפי שטח היא רוסיה, ששטחה כ 17.1 מיליון קילומטרים רבועים.',
    'המדינה הקטנה בעולם היא קריית הוותיקן, ששטחה פחות מחצי קילומטר רבוע.',
    'המדבר החם הגדול בעולם הוא מדבר סהרה, ששטחו כ 9.2 מיליון קילומטרים רבועים.',
    'המפל הגבוה בעולם הוא מפלי אנחל בוונצואלה, שגובה הנפילה הכולל שלהם כ 979 מטרים.',
    'האגם העמוק בעולם הוא ימת באיקל ברוסיה, שעומקה המרבי כ 1,642 מטרים.',
    'האי הגדול בעולם שאינו יבשת הוא גרינלנד, ששטחו כ 2.16 מיליון קילומטרים רבועים.',
    'הר הגעש הפעיל הגבוה בעולם הוא אוחוס דל סלאדו, בגבול צ׳ילה וארגנטינה, שגובהו כ 6,893 מטרים.'
  ];
  return 'שיאים עולמיים. ' + records.join(' ');
}
async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'YemotWorldSpaceAPI/1.0' } });
  if (!r.ok) throw new Error('שירות הנתונים אינו זמין');
  return r.json();
}
async function launches() {
  const cached = await storeGet('yemot-space:cache:launches');
  if (cached) return cached;
  const d = await json('https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=5&mode=list');

  const rows = (d.results || []).slice(0, 5);
  if (!rows.length) return 'לא נמצאו שיגורים קרובים במאגר.';
  const result = 'השיגורים הקרובים. ' + rows.map((x, i) => {
    const date = x.net ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(x.net)) : 'מועד לא ידוע';
    return `שיגור מספר ${i + 1}. ${esc(x.name)}. מועד ${date}. אתר השיגור: ${esc(x.pad?.location?.name || 'לא צוין')}.`;
  }).join(' ');
  await storeSet('yemot-space:cache:launches', result, 1800);
  return result;
}
async function country(code) {
  const normalized = String(code || '').replace(/\\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return 'קוד המדינה אינו תקין. יש להקליד שתי אותיות באנגלית.';
  const base = 'https://api.worldbank.org/v2/country/' + encodeURIComponent(normalized);
  const info = await json(base + '?format=json');
  const countries = Array.isArray(info?.[1]) ? info[1] : [];
  const item = countries.find(x => String(x.iso2Code || '').toUpperCase() === normalized && x.region?.id !== 'NA');
  if (!item) return 'לא נמצאה מדינה בקוד שהקשתם.';

  const indicatorIds = [
    'SP.POP.TOTL',
    'NY.GDP.MKTP.CD',
    'NY.GDP.PCAP.CD',
    'NY.GDP.MKTP.KD.ZG',
    'SP.DYN.LE00.IN',
    'SP.DYN.CBRT.IN',
    'SP.DYN.CDRT.IN',
    'SP.URB.TOTL.IN.ZS',
    'IT.NET.USER.ZS',
    'EG.ELC.ACCS.ZS',
    'AG.LND.FRST.ZS',
    'AG.LND.AGRI.ZS',
    'EN.ATM.CO2E.PC',
    'SL.UEM.TOTL.ZS',
    'FP.CPI.TOTL.ZG',
    'BX.KLT.DINV.WD.GD.ZS'
  ];
  const indicatorUrl = base + '/indicator/' + indicatorIds.join(';') + '?format=json&per_page=2000';
  const indicatorResponse = await json(indicatorUrl);
  const observations = Array.isArray(indicatorResponse?.[1]) ? indicatorResponse[1] : [];
  const latest = {};
  for (const row of observations) {
    const id = row.indicator?.id;
    if (!id || row.value == null) continue;
    if (!latest[id] || Number(row.date) > Number(latest[id].date)) latest[id] = row;
  }
  const fmt = (id, digits = 0) => {
    const row = latest[id];
    if (!row) return 'אין נתון זמין';
    return Number(row.value).toLocaleString('he-IL', { maximumFractionDigits: digits, minimumFractionDigits: digits }) + ' (שנת ' + row.date + ')';
  };
  const currency = (value) => value ? Object.values(value).map(x => x.name || x.symbol).filter(Boolean).join(', ') : 'לא צוין';
  const langNames = (value) => value ? Object.values(value).join(', ') : 'לא צוינו';

  let extra = {};
  try {
    const rest = await json('https://restcountries.com/v3.1/alpha/' + encodeURIComponent(normalized) + '?fields=name,capital,region,subregion,population,area,currencies,languages,timezones,latlng,cca3');
    extra = Array.isArray(rest) ? (rest[0] || {}) : rest;
  } catch (_) {}

  const name = esc(item.name);
  const capital = esc(item.capitalCity || extra.capital?.[0] || 'לא צוינה');
  const region = esc(extra.region || item.region?.value || 'לא ידוע');
  const subregion = esc(extra.subregion || 'לא צוינה');
  const latlng = Array.isArray(extra.latlng) ? extra.latlng.map(x => Number(x).toFixed(2)).join(' ו ') : '';
  const currencyText = esc(currency(extra.currencies));
  const languagesText = esc(langNames(extra.languages));
  const timezoneText = esc(Array.isArray(extra.timezones) ? extra.timezones.slice(0, 4).join(', ') : 'לא צוינו');
  const areaText = extra.area != null ? number(Math.round(extra.area)) + ' קילומטרים רבועים' : 'אין נתון זמין';

  const facts = [
    'שם המדינה: ' + name,
    'עיר הבירה: ' + capital,
    'האזור בעולם: ' + region,
    'תת אזור: ' + subregion,
    'אוכלוסייה: ' + fmt('SP.POP.TOTL'),
    'שטח המדינה: ' + areaText,
    'תוצר מקומי גולמי: ' + fmt('NY.GDP.MKTP.CD') + ' דולר',
    'תוצר לנפש: ' + fmt('NY.GDP.PCAP.CD') + ' דולר',
    'קצב צמיחת הכלכלה: ' + fmt('NY.GDP.MKTP.KD.ZG', 2) + ' אחוזים',
    'תוחלת חיים: ' + fmt('SP.DYN.LE00.IN', 1) + ' שנים',
    'שיעור לידות: ' + fmt('SP.DYN.CBRT.IN', 1) + ' לידות לאלף תושבים',
    'שיעור פטירות: ' + fmt('SP.DYN.CDRT.IN', 1) + ' פטירות לאלף תושבים',
    'אוכלוסייה עירונית: ' + fmt('SP.URB.TOTL.IN.ZS', 1) + ' אחוזים',
    'שימוש באינטרנט: ' + fmt('IT.NET.USER.ZS', 1) + ' אחוזים',
    'גישה לחשמל: ' + fmt('EG.ELC.ACCS.ZS', 1) + ' אחוזים',
    'שטח המדינה המכוסה יערות: ' + fmt('AG.LND.FRST.ZS', 1) + ' אחוזים',
    'שטח חקלאי: ' + fmt('AG.LND.AGRI.ZS', 1) + ' אחוזים',
    'פליטת פחמן דו חמצני לנפש: ' + fmt('EN.ATM.CO2E.PC', 2) + ' טונות',
    'שיעור אבטלה: ' + fmt('SL.UEM.TOTL.ZS', 1) + ' אחוזים',
    'אינפלציה: ' + fmt('FP.CPI.TOTL.ZG', 1) + ' אחוזים',
    'מטבע: ' + currencyText,
    'שפות: ' + languagesText,
    'אזורי זמן: ' + timezoneText,
    latlng ? 'קואורדינטות מרכזיות: ' + latlng : ''
  ].filter(Boolean);
  return 'מידע מורחב על ' + name + '. ' + facts.map((x, i) => 'פרט מספר ' + (i + 1) + '. ' + x + '.').join(' ');
}

async function countryRecords(code, kind = 'place') {
  const normalized = String(code || '').replace(/\\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return 'קוד המדינה אינו תקין. הקלידו שתי אותיות באנגלית.';
  const info = await json('https://api.worldbank.org/v2/country/' + encodeURIComponent(normalized) + '?format=json');
  const rows = Array.isArray(info?.[1]) ? info[1] : [];
  const countryItem = rows.find(x => String(x.iso2Code || '').toUpperCase() === normalized && x.region?.id !== 'NA');
  if (!countryItem) return 'לא נמצאה מדינה בקוד שהקשתם.';
  const countryName = esc(countryItem.name);

  const query = kind === 'people'
    ? `SELECT DISTINCT ?person ?personLabel ?occupationLabel ?awardLabel ?description WHERE {
        ?person wdt:P27 wd:${normalized === 'IL' ? 'Q801' : 'Q' + '0'} .
        OPTIONAL { ?person wdt:P106 ?occupation. }
        OPTIONAL { ?person wdt:P166 ?award. }
        OPTIONAL { ?person schema:description ?description FILTER(LANG(?description)="he" || LANG(?description)="en"). }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
      } LIMIT 25`
    : `SELECT DISTINCT ?item ?itemLabel ?description ?inception ?point WHERE {
        ?item wdt:P17 ?country.
        ?country wdt:P297 "${normalized}".
        OPTIONAL { ?item schema:description ?description FILTER(LANG(?description)="he" || LANG(?description)="en"). }
        OPTIONAL { ?item wdt:P571 ?inception. }
        OPTIONAL { ?item wdt:P625 ?point. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
        FILTER(BOUND(?description) || BOUND(?inception) || BOUND(?point))
      } LIMIT 35`;

  // Query by country entity using ISO alpha-2 country code; resolve country QID first.
  const countrySearch = 'SELECT ?country WHERE { ?country wdt:P297 "' + normalized + '". } LIMIT 1';
  const sparql = async (q) => {
    const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q);
    return json(url);
  };
  let countryQid = '';
  try {
    const c = await sparql(countrySearch);
    const uri = c?.results?.bindings?.[0]?.country?.value || '';
    countryQid = uri.split('/').pop();
  } catch (_) {}
  if (!countryQid) return 'המדינה נמצאה, אך מאגר ההישגים אינו זמין כרגע.';

  const actualQuery = kind === 'people'
    ? `SELECT DISTINCT ?person ?personLabel ?description ?occupationLabel ?awardLabel WHERE {
        ?person wdt:P27 wd:${countryQid}.
        OPTIONAL { ?person schema:description ?description FILTER(LANG(?description)="he" || LANG(?description)="en"). }
        OPTIONAL { ?person wdt:P106 ?occupation. }
        OPTIONAL { ?person wdt:P166 ?award. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
      } LIMIT 30`
    : `SELECT DISTINCT ?item ?itemLabel ?description ?inception WHERE {
        ?item wdt:P17 wd:${countryQid}.
        OPTIONAL { ?item schema:description ?description FILTER(LANG(?description)="he" || LANG(?description)="en"). }
        OPTIONAL { ?item wdt:P571 ?inception. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
      } LIMIT 35`;
  let bindings = [];
  try {
    const result = await sparql(actualQuery);
    bindings = result?.results?.bindings || [];
  } catch (_) {
    return 'מאגר המידע אינו זמין כרגע. אפשר לנסות שוב מאוחר יותר.';
  }

  const seen = new Set();
  const entries = [];
  for (const b of bindings) {
    const uri = b.person?.value || b.item?.value || '';
    const label = b.personLabel?.value || b.itemLabel?.value || '';
    if (!label || seen.has(uri)) continue;
    seen.add(uri);
    const desc = b.description?.value || b.occupationLabel?.value || b.awardLabel?.value || '';
    const year = b.inception?.value ? new Date(b.inception.value).getUTCFullYear() : '';
    entries.push({ label: esc(label), desc: esc(desc), year });
  }
  if (!entries.length) return 'לא נמצאו כרגע רשומות מתאימות במאגר עבור ' + countryName + '.';
  const heading = kind === 'people'
    ? 'אנשים והישגים הקשורים ל ' + countryName
    : 'אתרים, מבנים ומקומות בולטים ב ' + countryName;
  const lines = entries.slice(0, 15).map((x, i) =>
    'פריט ' + (i + 1) + '. ' + x.label + (x.desc ? '. מידע: ' + x.desc : '') + (x.year ? '. שנת התחלה: ' + x.year : '') + '.'
  );
  return heading + '. נמצאו ' + entries.length + ' רשומות ראשוניות במאגר ויקידאטה. שימו לב, אלו רשומות מידע ולא בהכרח שיאי גינס מאומתים. ' + lines.join(' ');
}

function countryFromSpeech(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[.,!?]/g, ' ');
  const aliases = {
    'ישראל':'IL','israel':'IL','ארצות הברית':'US','ארצות הברית של אמריקה':'US','usa':'US','united states':'US',
    'בריטניה':'GB','אנגליה':'GB','united kingdom':'GB','uk':'GB','צרפת':'FR','france':'FR',
    'גרמניה':'DE','germany':'DE','איטליה':'IT','italy':'IT','ספרד':'ES','spain':'ES',
    'רוסיה':'RU','russia':'RU','אוקראינה':'UA','ukraine':'UA','קנדה':'CA','canada':'CA',
    'אוסטרליה':'AU','australia':'AU','יפן':'JP','japan':'JP','סין':'CN','china':'CN',
    'הודו':'IN','india':'IN','ברזיל':'BR','brazil':'BR','מקסיקו':'MX','mexico':'MX',
    'שוויץ':'CH','שווייץ':'CH','switzerland':'CH','אוסטריה':'AT','austria':'AT',
    'יוון':'GR','greece':'GR','פולין':'PL','poland':'PL','הולנד':'NL','netherlands':'NL',
    'בלגיה':'BE','belgium':'BE','טורקיה':'TR','turkey':'TR','מצרים':'EG','egypt':'EG',
    'מרוקו':'MA','morocco':'MA','דרום אפריקה':'ZA','south africa':'ZA','איחוד האמירויות':'AE',
    'תאילנד':'TH','thailand':'TH','גאורגיה':'GE','גרוזיה':'GE','georgia':'GE','בולגריה':'BG','bulgaria':'BG'
  };
  return aliases[t] || '';
}
async function downloadYemotRecording(path) {
  const token = process.env.YEMOT_TOKEN;
  if (!token) throw new Error('חסר YEMOT_TOKEN בהגדרות Vercel');
  const cleanPath = String(path || '').trim();
  if (!cleanPath || cleanPath.length > 300 || /https?:|\.\./i.test(cleanPath)) throw new Error('נתיב ההקלטה אינו תקין');
  const endpoint = 'https://www.call2all.co.il/ym/api/DownloadFile?token=' + encodeURIComponent(token) + '&path=' + encodeURIComponent(cleanPath);
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('לא ניתן להוריד את ההקלטה מימות המשיח');
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 12 * 1024 * 1024) throw new Error('גודל ההקלטה אינו תקין');
  return bytes;
}
async function transcribeWithGroq(audio) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('skip');
  const form = new FormData();
  form.append('file', new Blob([audio], { type: 'audio/wav' }), 'country.wav');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'he');
  form.append('response_format', 'json');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form
  });
  if (!r.ok) throw new Error('Groq ' + r.status);
  const d = await r.json();
  if (!d.text) throw new Error('Groq returned empty transcript');
  return d.text;
}
async function transcribeWithDeepgram(audio) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error('skip');
  const r = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=he&smart_format=true', {
    method: 'POST', headers: { Authorization: 'Token ' + key, 'Content-Type': 'audio/wav' }, body: audio
  });
  if (!r.ok) throw new Error('Deepgram ' + r.status);
  const d = await r.json();
  const transcript = d.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (!transcript) throw new Error('Deepgram returned empty transcript');
  return transcript;
}
async function transcribeWithAssemblyAI(audio) {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error('skip');
  const upload = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST', headers: { authorization: key, 'content-type': 'application/octet-stream' }, body: audio
  });
  if (!upload.ok) throw new Error('AssemblyAI upload ' + upload.status);
  const up = await upload.json();
  const create = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST', headers: { authorization: key, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: up.upload_url, language_code: 'he' })
  });
  if (!create.ok) throw new Error('AssemblyAI ' + create.status);
  const job = await create.json();
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const poll = await fetch('https://api.assemblyai.com/v2/transcript/' + encodeURIComponent(job.id), { headers: { authorization: key } });
    if (!poll.ok) throw new Error('AssemblyAI polling ' + poll.status);
    const result = await poll.json();
    if (result.status === 'completed' && result.text) return result.text;
    if (result.status === 'error') throw new Error('AssemblyAI transcription failed');
  }
  throw new Error('AssemblyAI transcription timeout');
}
async function transcribeCountry(audioPath) {
  const audio = await downloadYemotRecording(audioPath);
  const providers = [transcribeWithGroq, transcribeWithDeepgram, transcribeWithAssemblyAI];
  const errors = [];
  for (const provider of providers) {
    try { return await provider(audio); }
    catch (e) { if (e.message !== 'skip') errors.push(e.message); }
  }
  throw new Error(errors.length ? 'כל שירותי זיהוי הדיבור נכשלו: ' + errors.join('; ') : 'לא הוגדרו מפתחות API לשירותי זיהוי הדיבור');
}

async function earthquakes() {
  const d = await json('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
  const rows = (d.features || []).slice(0, 5);
  if (!rows.length) return 'לא דווחו רעידות אדמה בעוצמה שתיים וחצי ומעלה ביממה האחרונה לפי המאגר.';
  return 'רעידות האדמה הבולטות ביממה האחרונה. ' + rows.map((x, i) => {
    const p = x.properties || {}, co = x.geometry?.coordinates || [];
    const when = p.time ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(p.time)) : 'זמן לא ידוע';
    return `אירוע ${i + 1}. עוצמה ${p.mag ?? 'לא ידועה'}. ${esc(p.place || 'מיקום לא ידוע')}. עומק ${co[2] ?? 'לא ידוע'} קילומטרים. שעה ${when}.`;
  }).join(' ');
}
async function issPosition() {
  const d = await json('https://api.wheretheiss.at/v1/satellites/25544');
  return `תחנת החלל הבינלאומית נמצאת כעת בקו רוחב ${Number(d.latitude).toFixed(2)}, קו אורך ${Number(d.longitude).toFixed(2)}. גובה ${Math.round(d.altitude)} קילומטרים. מהירות ${Math.round(d.velocity)} קילומטרים בשעה. הנתונים מתעדכנים בזמן אמת בקירוב.`;
}

async function numberFact(n) {
  const d = await json('https://numbersapi.com/' + encodeURIComponent(n) + '/trivia?json');
  return d.text ? esc(d.text) : 'לא נמצאה עובדה על המספר הזה.';
}

async function storeGet(key) {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;
  const response = await fetch(base.replace(/\/$/, '') + '/get/' + encodeURIComponent(key), {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!response.ok) throw new Error('שירות שמירת הנתונים אינו זמין');
  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}
async function storeSet(key, value, ttl = 600) {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return false;
  const response = await fetch(base.replace(/\/$/, '') + '/set/' + encodeURIComponent(key) + '/' + encodeURIComponent(JSON.stringify(value)) + '?EX=' + ttl, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!response.ok) throw new Error('לא ניתן לשמור את נתוני החיפוש');
  return true;
}
function sessionKey(url) {
  const phone = val(url, ['ApiPhone']) || 'anonymous';
  const did = val(url, ['ApiDID', 'ApiRealDID']) || 'default';
  return 'yemot-space:' + createHash('sha256').update(phone + ':' + did).digest('hex');
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://' + (req.headers?.host || 'localhost'));
  const key = sessionKey(url);
  const countryCode = val(url, ['CountryCode']);
  const recordsCountryCode = val(url, ['RecordsCountryCode']);
  const speechRecord = val(url, ['SpeechRecord', 'CountryAudio', 'record', 'RecordPath']);
  const recordsAction = val(url, ['RecordsAction']);
  const recordsKind = val(url, ['RecordsKind']);
  const num = val(url, ['NumberInput']);
  const countryAction = val(url, ['CountryAction']);
  const numberAction = val(url, ['NumberAction']);
  const choice = val(url, ['wm_nav', 'Choice', 'ApiPhoneInput', 'Digits', 'val']).replace(/[^0-9]/g, '');

  try {
    if (recordsKind === '1' || recordsKind === '2') return sendYemot(res, 'אמרו את שם המדינה אחרי הצליל. לזיהוי באמצעות הקלדה, הקישו 0.', { inputName: 'SpeechRecord', min: 1, max: 1, timeout: '8', inputType: 'record' });
    if (speechRecord === '0') return sendYemot(res, 'הקלידו קוד מדינה בן שתי אותיות באנגלית, לדוגמה I L.', { inputName: 'RecordsCountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
    if (speechRecord) {
      const transcript = await transcribeCountry(speechRecord);
      const detected = countryFromSpeech(transcript);
      if (!detected) return sendYemot(res, 'לא זיהיתי מדינה מתוך מה שאמרתם. אפשר לנסות שוב או להקליד קוד מדינה באנגלית.', { inputName: 'RecordsCountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
      return sendYemot(res, 'זיהיתי את המדינה ' + transcript + '. ' + await countryRecords(detected, recordsKind === '2' ? 'people' : 'place') + ' לחיפוש מדינה נוספת הקישו 1. לתפריט הראשי הקישו 0.', { inputName: 'RecordsAction', min: 1, max: 1, timeout: '8' });
    }
    if (recordsCountryCode) {
      const cleaned = recordsCountryCode.replace(/\\s+/g, '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(cleaned)) return sendYemot(res, 'קוד המדינה אינו תקין. הקלידו שתי אותיות באנגלית.', { inputName: 'RecordsCountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
      return sendYemot(res, await countryRecords(cleaned, recordsKind === '2' ? 'people' : 'place') + ' לחיפוש מדינה נוספת הקישו 1. לתפריט הראשי הקישו 0.', { inputName: 'RecordsAction', min: 1, max: 1, timeout: '8' });
    }
    if (recordsAction === '1') return sendYemot(res, 'אמרו את שם המדינה אחרי הצליל, או הקישו קוד מדינה בן שתי אותיות באנגלית.', { inputName: 'SpeechRecord', min: 1, max: 1, timeout: '8', inputType: 'record' });
    if (recordsAction === '0') return sendYemot(res, menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });

    if (countryCode) {
      if (!/^[a-z]{2}$/i.test(countryCode.replace(/\s+/g, ''))) return sendYemot(res, 'קוד המדינה אינו תקין. הקלידו שתי אותיות באנגלית.', { inputName: 'CountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
      return sendYemot(res, await country(countryCode) + ' לחיפוש מדינה נוספת הקישו 1. לתפריט הראשי הקישו 0.', { inputName: 'CountryAction', min: 1, max: 1, timeout: '8' });
    }
    if (countryAction === '1') return sendYemot(res, 'הקלידו קוד מדינה בן שתי אותיות באנגלית.', { inputName: 'CountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
    if (countryAction === '0' || numberAction === '0') return sendYemot(res, menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });

    if (num) {
      if (!/^-?\d{1,9}$/.test(num)) return sendYemot(res, 'המספר אינו תקין. הקישו מספר שלם עד תשע ספרות.', { inputName: 'NumberInput', min: 1, max: 9, timeout: '8' });
      return sendYemot(res, await numberFact(num) + ' לעובדה על מספר נוסף הקישו 1. לתפריט הראשי הקישו 0.', { inputName: 'NumberAction', min: 1, max: 1, timeout: '8' });
    }
    if (numberAction === '1') return sendYemot(res, 'הקישו מספר שלם לקבלת עובדה מעניינת.', { inputName: 'NumberInput', min: 1, max: 9, timeout: '8' });

    if (!choice) return sendYemot(res, menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });
    if (choice === '1') return sendYemot(res, worldRecords() + ' לתפריט הראשי הקישו 0.', { inputName: 'WorldRecordsAction', min: 1, max: 1, timeout: '8' });
    if (choice === '2') return sendYemot(res, await launches() + ' לתפריט הראשי הקישו 0.', { inputName: 'LaunchAction', min: 1, max: 1, timeout: '8' });
    if (choice === '3') return sendYemot(res, 'הקלידו קוד מדינה בן שתי אותיות באנגלית, לדוגמה I L עבור ישראל.', { inputName: 'CountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
    if (choice === '4') return sendYemot(res, 'הקישו מספר שלם לקבלת עובדה מעניינת.', { inputName: 'NumberInput', min: 1, max: 9, timeout: '8' });
    if (choice === '5') return sendYemot(res, 'מעברי לוויינים מעל ישראל אינם זמינים כרגע.', { inputName: 'wm_nav', min: 1, max: 1, timeout: '8' });
    if (choice === '6') return sendYemot(res, await earthquakes() + ' לתפריט הראשי הקישו 0.', { inputName: 'EarthquakeAction', min: 1, max: 1, timeout: '8' });
    if (choice === '7') return sendYemot(res, await issPosition() + ' לתפריט הראשי הקישו 0.', { inputName: 'ISSAction', min: 1, max: 1, timeout: '8' });
    if (choice === '8') return sendYemot(res, 'מאגר גינס הרשמי מאפשר חיפוש באתר, אך אינו מספק ממשק חיפוש ציבורי חופשי לפי מדינה. גינס גם מציין שאינו מאמת שיאים לאומיים או שיאים ייחודיים למדינה. אפשר לשמוע מידע מורחב על מדינה בשלוחה 3.', { inputName: 'RecordsKind', min: 1, max: 1, timeout: '8' });
    return sendYemot(res, 'הבחירה לא זוהתה. ' + menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });
  } catch (e) {
    const msg = String(e?.message || 'תקלה לא ידועה').replace(/[.=\r\n]/g, ' ').slice(0, 180);
    return sendYemot(res, 'הפעולה נכשלה. הסיבה: ' + msg + '. לתפריט הראשי הקישו 0.', { inputName: 'ErrorAction', min: 1, max: 1, timeout: '8' });
  }
}