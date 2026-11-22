function sendYemot(res, text, options = {}) {
  const { inputName = 'wm_nav', min = 1, max = 1, timeout = '5', inputType = 'Digits' } = options;
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const safe = String(text)
    .replace(/[\r\n]+/g, ' ')
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
  return 'ברוכים הבאים למרכז מידע עולם וחלל. לשיגורי חלל קרובים הקישו 1. לחיפוש לוויין הקישו 2. למידע על מדינה הקישו 3. לעובדה מעניינת על מספר הקישו 4. למידע על מעברי לוויינים הקישו 5. לרעידות אדמה בעולם הקישו 6. למיקום תחנת החלל הקישו 7. למעקב טיסות עולמי הקישו 8. לאוכלוסיית העולם הקישו 9.';
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
}
async function satellite(q) {
  const d = await json('https://celestrak.org/NORAD/elements/gp.php?NAME=' + encodeURIComponent(q) + '&FORMAT=JSON');
  const rows = Array.isArray(d) ? d.slice(0, 5) : [];
  if (!rows.length) return 'לא נמצאו לוויינים מתאימים. אפשר לנסות שם באנגלית, למשל איי אס אס באנגלית.';
  return 'נמצאו ' + rows.length + ' תוצאות. ' + rows.map((x, i) =>
    `תוצאה ${i + 1}. ${esc(x.OBJECT_NAME)}. מספר קטלוגי ${esc(x.NORAD_CAT_ID)}.`
  ).join(' ');
}
async function country(code) {
  const d = await json('https://api.worldbank.org/v2/country/' + encodeURIComponent(code) + '/indicator/SP.POP.TOTL?format=json&per_page=1');
  const row = d?.[1]?.[0];
  if (!row) return 'לא נמצאה מדינה בקוד שהקשתם.';
  const info = await json('https://api.worldbank.org/v2/country/' + encodeURIComponent(code) + '?format=json');
  const region = info?.[1]?.[0]?.region?.value || 'לא ידוע';
  return `${esc(row.country?.value || code)}. אוכלוסייה לפי הנתון האחרון במאגר: ${row.value ? number(row.value) : 'אין נתון זמין'}. שנת הנתון: ${row.date || 'לא ידועה'}. אזור בעולם: ${esc(region)}.`;
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
async function jsonWithHeaders(url, headers) {
  const r = await fetch(url, { headers: { 'User-Agent': 'YemotWorldSpaceAPI/1.0', ...headers } });
  if (!r.ok) throw new Error('שירות הנתונים החזיר שגיאה ' + r.status);
  return r.json();
}
async function globalFlights() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('מעקב הטיסות אינו מחובר עדיין. חסרים פרטי API של OpenSky בשרת.');
  const tokenRes = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
  });
  if (!tokenRes.ok) throw new Error('OpenSky לא אישר גישה. בדקו את פרטי ה-API.');
  const token = await tokenRes.json();
  const d = await jsonWithHeaders('https://opensky-network.org/api/states/all', { Authorization: 'Bearer ' + token.access_token });
  const states = Array.isArray(d.states) ? d.states : [];
  const airborne = states.filter(s => s && s[5] != null && s[6] != null && s[8] === false);
  const sample = airborne.slice(0, 5).map((s, i) => {
    const call = String(s[1] || '').trim() || 'מספר זיהוי לא זמין';
    const country = s[2] || 'מדינה לא ידועה';
    const alt = s[7] == null ? 'גובה לא ידוע' : Math.round(s[7]) + ' מטרים';
    const speed = s[9] == null ? 'מהירות לא ידועה' : Math.round(s[9] * 3.6) + ' קילומטרים בשעה';
    return `מטוס ${i+1}. ${esc(call)}. מדינה ${esc(country)}. גובה ${alt}. מהירות ${speed}.`;
  });
  return `במאגר התקבלו ${number(states.length)} כלי טיס, מתוכם ${number(airborne.length)} באוויר עם מיקום ידוע. ` + (sample.length ? sample.join(' ') : 'אין כרגע דוגמאות זמינות.');
}
async function worldPopulation() {
  const d = await json('https://api.worldbank.org/v2/country/WLD/indicator/SP.POP.TOTL?format=json&per_page=1');
  const row = d?.[1]?.[0];
  if (!row || row.value == null) return 'נתון אוכלוסיית העולם אינו זמין כרגע במאגר.';
  return `לפי הבנק העולמי, אוכלוסיית העולם בנתון האחרון שפורסם עמדה על כ${number(row.value)} בני אדם. שנת הנתון היא ${row.date}.`;
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
  return 'yemot-space:' + encodeURIComponent(phone + ':' + did);
}
async function satelliteSearch(q) {
  const cacheKey = 'yemot-space:cache:sat:' + encodeURIComponent(q.toLowerCase());
  const cached = await storeGet(cacheKey);
  if (cached) return cached;
  const numeric = /^\\d{1,8}$/.test(q);
  const endpoint = numeric
    ? 'https://celestrak.org/NORAD/elements/gp.php?CATNR=' + encodeURIComponent(q) + '&FORMAT=JSON'
    : 'https://celestrak.org/NORAD/elements/gp.php?NAME=' + encodeURIComponent(q) + '&FORMAT=JSON';
  const d = await json(endpoint);
  const rows = (Array.isArray(d) ? d : []).slice(0, 5).map(x => ({
    name: String(x.OBJECT_NAME || 'לוויין ללא שם'),
    id: String(x.NORAD_CAT_ID || ''),
    period: x.ORBITAL_PERIOD == null ? null : Number(x.ORBITAL_PERIOD)
  })).filter(x => x.id);
  await storeSet(cacheKey, rows, 7200);
  return rows;
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://' + (req.headers?.host || 'localhost'));
  const key = sessionKey(url);
  const sat = val(url, ['SatelliteName']);
  const satChoice = val(url, ['SatelliteChoice']);
  const satAction = val(url, ['SatelliteAction']);
  const countryCode = val(url, ['CountryCode']);
  const num = val(url, ['NumberInput']);
  const countryAction = val(url, ['CountryAction']);
  const numberAction = val(url, ['NumberAction']);
  const choice = val(url, ['wm_nav', 'Choice', 'ApiPhoneInput', 'Digits', 'val']).replace(/[^0-9]/g, '');

  try {
    if (sat) {
      const rows = await satelliteSearch(sat);
      if (!rows.length) return sendYemot(res, 'לא נמצאו לוויינים מתאימים. נסו שם באנגלית או מספר קטלוגי אחר. לחיפוש חדש הקישו 8. לתפריט הראשי הקישו 0.', { inputName: 'SatelliteAction', min: 1, max: 1, timeout: '8' });
      const saved = await storeSet(key + ':satellites', rows, 600);
      const spoken = rows.map((x, i) => 'אפשרות ' + (i + 1) + '. ' + esc(x.name) + '.').join(' ');
      if (!saved) return sendYemot(res, 'נמצאו ' + rows.length + ' לוויינים. ' + spoken + ' כדי לבחור תוצאה יש להפעיל שמירת נתונים בשרת. לחיפוש חדש הקישו 8.', { inputName: 'SatelliteAction', min: 1, max: 1, timeout: '8' });
      return sendYemot(res, 'נמצאו ' + rows.length + ' לוויינים. ' + spoken + ' לבחירת אפשרות אחת עד חמש הקישו את מספר האפשרות. לחיפוש חדש הקישו 8. לתפריט הראשי הקישו 0.', { inputName: 'SatelliteChoice', min: 1, max: 1, timeout: '8' });
    }
    if (satChoice) {
      const rows = await storeGet(key + ':satellites');
      const n = Number(satChoice);
      if (!rows || !Number.isInteger(n) || n < 1 || n > rows.length) return sendYemot(res, 'הבחירה אינה תקפה או שפג תוקף החיפוש. לחיפוש חדש הקישו 8. לתפריט הראשי הקישו 0.', { inputName: 'SatelliteAction', min: 1, max: 1, timeout: '8' });
      const x = rows[n - 1];
      return sendYemot(res, 'בחרתם ' + esc(x.name) + '. מספר קטלוגי ' + x.id + '. ' + (x.period ? 'זמן הקפה ' + Math.round(x.period) + ' דקות.' : '') + ' לחיפוש לוויין נוסף הקישו 8. לתפריט הראשי הקישו 0.', { inputName: 'SatelliteAction', min: 1, max: 1, timeout: '8' });
    }
    if (satAction === '8') return sendYemot(res, 'הקלידו שם לוויין באנגלית או מספר NORAD, וסיימו בסולמית.', { inputName: 'SatelliteName', min: 1, max: 40, timeout: '10', inputType: 'EnglishKeyboard' });
    if (satAction === '0') return sendYemot(res, menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });

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
    if (choice === '1') return sendYemot(res, await launches() + ' לתפריט הראשי הקישו 0.', { inputName: 'LaunchAction', min: 1, max: 1, timeout: '8' });
    if (choice === '2') return sendYemot(res, 'הקלידו שם לוויין באנגלית או מספר NORAD, וסיימו בסולמית.', { inputName: 'SatelliteName', min: 1, max: 40, timeout: '10', inputType: 'EnglishKeyboard' });
    if (choice === '3') return sendYemot(res, 'הקלידו קוד מדינה בן שתי אותיות באנגלית, לדוגמה I L עבור ישראל.', { inputName: 'CountryCode', min: 2, max: 2, timeout: '10', inputType: 'EnglishKeyboard' });
    if (choice === '4') return sendYemot(res, 'הקישו מספר שלם לקבלת עובדה מעניינת.', { inputName: 'NumberInput', min: 1, max: 9, timeout: '8' });
    if (choice === '5') return sendYemot(res, 'מעברי לוויינים מעל ישראל עדיין אינם מחושבים. נדרש מנוע חישוב מסלולים ושמירת נתוני מסלול.', { inputName: 'wm_nav', min: 1, max: 1, timeout: '8' });
    if (choice === '6') return sendYemot(res, await earthquakes() + ' לתפריט הראשי הקישו 0.', { inputName: 'EarthquakeAction', min: 1, max: 1, timeout: '8' });
    if (choice === '7') return sendYemot(res, await issPosition() + ' לתפריט הראשי הקישו 0.', { inputName: 'ISSAction', min: 1, max: 1, timeout: '8' });
    if (choice === '8') return sendYemot(res, await globalFlights() + ' לתפריט הראשי הקישו 0.', { inputName: 'FlightAction', min: 1, max: 1, timeout: '8' });
    if (choice === '9') return sendYemot(res, await worldPopulation() + ' לתפריט הראשי הקישו 0.', { inputName: 'PopulationAction', min: 1, max: 1, timeout: '8' });
    return sendYemot(res, 'הבחירה לא זוהתה. ' + menu(), { inputName: 'wm_nav', min: 1, max: 1, timeout: '5' });
  } catch (e) {
    const msg = String(e?.message || 'תקלה לא ידועה').replace(/[.=\r\n]/g, ' ').slice(0, 180);
    return sendYemot(res, 'הפעולה נכשלה. הסיבה: ' + msg + '. לתפריט הראשי הקישו 0.', { inputName: 'ErrorAction', min: 1, max: 1, timeout: '8' });
  }
}