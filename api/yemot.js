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
  return 'ברוכים הבאים למרכז מידע עולם וחלל. לשיאים עולמיים הקישו 1. לשיגורי חלל קרובים הקישו 2. למידע על מדינה הקישו 3. לעובדה מעניינת על מספר הקישו 4. למידע על מעברי לוויינים הקישו 5. לרעידות אדמה בעולם הקישו 6. למיקום תחנת החלל הקישו 7.';
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

  // Each indicator is fetched independently so one unavailable statistic
  // cannot break the entire country-information menu.
  const indicators = [
    ['SP.POP.TOTL', 'אוכלוסייה', 0, ' תושבים'],
    ['NY.GDP.MKTP.CD', 'תוצר מקומי גולמי', 0, ' דולר'],
    ['NY.GDP.PCAP.CD', 'תוצר לנפש', 0, ' דולר לנפש'],
    ['NY.GDP.MKTP.KD.ZG', 'צמיחה כלכלית', 2, ' אחוזים'],
    ['SP.DYN.LE00.IN', 'תוחלת חיים', 1, ' שנים'],
    ['SP.DYN.CBRT.IN', 'שיעור לידות', 1, ' לידות לאלף תושבים'],
    ['SP.DYN.CDRT.IN', 'שיעור פטירות', 1, ' פטירות לאלף תושבים'],
    ['SP.URB.TOTL.IN.ZS', 'אוכלוסייה עירונית', 1, ' אחוזים'],
    ['IT.NET.USER.ZS', 'שימוש באינטרנט', 1, ' אחוזים'],
    ['EG.ELC.ACCS.ZS', 'גישה לחשמל', 1, ' אחוזים'],
    ['AG.LND.FRST.ZS', 'שטח מכוסה יערות', 1, ' אחוזים'],
    ['AG.LND.AGRI.ZS', 'שטח חקלאי', 1, ' אחוזים'],
    ['SL.UEM.TOTL.ZS', 'שיעור אבטלה', 1, ' אחוזים'],
    ['FP.CPI.TOTL.ZG', 'אינפלציה', 1, ' אחוזים']
  ];

  const latestIndicator = async (id) => {
    try {
      const response = await json(base + '/indicator/' + id + '?format=json&per_page=80');
      const rows = Array.isArray(response?.[1]) ? response[1] : [];
      const row = rows.find(x => x.value !== null && x.value !== undefined);
      return row || null;
    } catch (_) {
      return null;
    }
  };

  const values = await Promise.all(indicators.map(async ([id]) => latestIndicator(id)));
  const formatIndicator = (definition, row) => {
    const [id, label, digits, unit] = definition;
    if (!row) return label + ': אין נתון זמין כרגע.';
    const value = Number(row.value).toLocaleString('he-IL', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
    return label + ': ' + value + unit + ' (נתוני ' + row.date + ').';
  };

  let extra = {};
  try {
    const response = await json('https://restcountries.com/v3.1/alpha/' + encodeURIComponent(normalized) + '?fields=capital,region,subregion,area,currencies,languages,timezones');
    extra = Array.isArray(response) ? (response[0] || {}) : response;
  } catch (_) {}

  const capital = esc(item.capitalCity || extra.capital?.[0] || 'לא צוינה');
  const region = esc(extra.region || item.region?.value || 'לא ידוע');
  const subregion = esc(extra.subregion || 'לא צוין');
  const area = extra.area == null ? 'אין נתון זמין' : number(Math.round(extra.area)) + ' קילומטרים רבועים';
  const currencies = extra.currencies
    ? Object.values(extra.currencies).map(x => x.name || x.symbol).filter(Boolean).join(', ')
    : 'לא צוין';
  const languages = extra.languages ? Object.values(extra.languages).join(', ') : 'לא צוינו';
  const timezones = Array.isArray(extra.timezones) ? extra.timezones.slice(0, 5).join(', ') : 'לא צוינו';

  const facts = [
    'שם המדינה: ' + esc(item.name) + '.',
    'עיר הבירה: ' + capital + '.',
    'האזור בעולם: ' + region + '.',
    'תת אזור: ' + subregion + '.',
    'שטח המדינה: ' + area + '.',
    ...indicators.map((definition, index) => formatIndicator(definition, values[index])),
    'המטבע: ' + esc(currencies) + '.',
    'השפות: ' + esc(languages) + '.',
    'אזורי זמן: ' + esc(timezones) + '.'
  ];

  return 'מידע מורחב על ' + esc(item.name) + '. ' +
    facts.map((fact, index) => 'פרט מספר ' + (index + 1) + '. ' + fact).join(' ');
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
  const num = val(url, ['NumberInput']);
  const countryAction = val(url, ['CountryAction']);
  const numberAction = val(url, ['NumberAction']);
  const choice = val(url, ['wm_nav', 'Choice', 'ApiPhoneInput', 'Digits', 'val']).replace(/[^0-9]/g, '');

  try {
    if (countryCode) {
      if (!/^[a-z]{2}$/i.test(countryCode)) return sendYemot(res, 'קוד המדינה אינו תקין. הקלידו שתי אותיות באנגלית.', { inputName: 'CountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
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
    return sendYemot(res, 'הבחירה לא זוהתה. ' + menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });
  } catch (e) {
    const msg = String(e?.message || 'תקלה לא ידועה').replace(/[.=\r\n]/g, ' ').slice(0, 180);
    return sendYemot(res, 'הפעולה נכשלה. הסיבה: ' + msg + '. לתפריט הראשי הקישו 0.', { inputName: 'ErrorAction', min: 1, max: 1, timeout: '8' });
  }
}