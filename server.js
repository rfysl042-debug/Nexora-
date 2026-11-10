const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const Stripe = require('stripe');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const db = new Database(process.env.DB_FILE || path.join(__dirname, 'data', 'nexora.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), email TEXT NOT NULL, items_json TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', total REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'sar', status TEXT NOT NULL DEFAULT 'pending', stripe_session_id TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);
const products = [
  { id: 'pubg', name: 'شدات PUBG Mobile', category: 'games', categoryLabel: 'ألعاب', emoji: '🎯', description: 'اشحن شدات PUBG لحسابك باستخدام Player ID.', accountLabel: 'Player ID', placeholder: 'أدخل Player ID', requiresAccount: true, bundles: [{ label: '60 شدة', price: 4.99 }, { label: '325 شدة', price: 19.99 }, { label: '660 شدة', price: 37.99 }] },
  { id: 'freefire', name: 'جواهر Free Fire', category: 'games', categoryLabel: 'ألعاب', emoji: '💎', description: 'اختر باقة الجواهر وأدخل معرّف اللاعب.', accountLabel: 'معرّف اللاعب', placeholder: 'أدخل معرّف اللاعب', requiresAccount: true, bundles: [{ label: '100 جوهرة', price: 4.99 }, { label: '310 جواهر', price: 13.99 }, { label: '520 جوهرة', price: 21.99 }] },
  { id: 'roblox', name: 'Roblox Gift Card', category: 'games', categoryLabel: 'ألعاب', emoji: '🧱', description: 'بطاقة رقمية لإضافة رصيد إلى Roblox.', accountLabel: 'اسم المستخدم', placeholder: 'اسم Roblox (اختياري)', requiresAccount: false, bundles: [{ label: '400 Robux', price: 19.99 }, { label: '800 Robux', price: 37.99 }, { label: '1700 Robux', price: 74.99 }] },
  { id: 'tiktok', name: 'عملات TikTok', category: 'social', categoryLabel: 'تواصل اجتماعي', emoji: '🎵', description: 'باقات عملات TikTok لحسابك.', accountLabel: 'اسم المستخدم', placeholder: 'أدخل اسم المستخدم', requiresAccount: true, bundles: [{ label: '70 عملة', price: 4.99 }, { label: '350 عملة', price: 22.99 }, { label: '700 عملة', price: 44.99 }] },
  { id: 'instagram', name: 'باقة Instagram', category: 'social', categoryLabel: 'تواصل اجتماعي', emoji: '📸', description: 'خدمات ترويج للحساب وفق سياسات المنصة.', accountLabel: 'رابط الحساب', placeholder: 'أدخل رابط الحساب', requiresAccount: true, bundles: [{ label: 'باقة أساسية', price: 9.99 }, { label: 'باقة متوسطة', price: 24.99 }, { label: 'باقة مميزة', price: 49.99 }] },
  { id: 'google-play', name: 'بطاقة Google Play', category: 'balance', categoryLabel: 'بطاقات وأرصدة', emoji: '▶️', description: 'رصيد رقمي لمتجر Google Play. تحقق من المنطقة.', accountLabel: 'البريد الإلكتروني (اختياري)', placeholder: 'اختياري', requiresAccount: false, bundles: [{ label: 'رصيد 10 ر.س', price: 10 }, { label: 'رصيد 25 ر.س', price: 25 }, { label: 'رصيد 50 ر.س', price: 50 }] },
  { id: 'app-store', name: 'بطاقة App Store', category: 'balance', categoryLabel: 'بطاقات وأرصدة', emoji: '🍎', description: 'بطاقة رصيد رقمية لمتجر Apple. تحقق من المنطقة.', accountLabel: 'البريد الإلكتروني (اختياري)', placeholder: 'اختياري', requiresAccount: false, bundles: [{ label: 'رصيد 10 ر.س', price: 10 }, { label: 'رصيد 25 ر.س', price: 25 }, { label: 'رصيد 50 ر.س', price: 50 }] },
  { id: 'mobile', name: 'رصيد جوال', category: 'balance', categoryLabel: 'بطاقات وأرصدة', emoji: '📶', description: 'اختر مبلغ الرصيد وأدخل رقم الجوال المراد شحنه.', accountLabel: 'رقم الجوال', placeholder: '05xxxxxxxx', requiresAccount: true, bundles: [{ label: 'شحن 10 ر.س', price: 10 }, { label: 'شحن 20 ر.س', price: 20 }, { label: 'شحن 50 ر.س', price: 50 }] },
  { id: 'discord', name: 'اشتراك Discord Nitro', category: 'social', categoryLabel: 'تواصل اجتماعي', emoji: '🎧', description: 'اختر مدة الاشتراك وأدخل اسم المستخدم.', accountLabel: 'اسم المستخدم', placeholder: 'أدخل اسم المستخدم', requiresAccount: true, bundles: [{ label: 'شهر واحد', price: 39.99 }, { label: '3 أشهر', price: 109.99 }, { label: 'سنة', price: 399.99 }] }
];
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], frameAncestors: ["'none'"] } } }));
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '20kb' }));
app.use(session({ name: 'nexora.sid', secret: process.env.SESSION_SECRET || (isProduction ? '' : 'local-development-only-change-me'), resave: false, saveUninitialized: false, store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'data') }), cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 1000 * 60 * 60 * 24 * 7 } }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use('/api/checkout', rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false }));

function requireConfigured(req, res, next) { if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) return res.status(503).json({ error: 'ضبط SESSION_SECRET قوي مطلوب قبل تشغيل الإنتاج.' }); next(); }
function sameOrigin(req, res, next) { if (req.method === 'GET' || req.path === '/webhooks/stripe') return next(); const origin = req.get('origin'); if (!origin || new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'طلب غير مسموح.' }); next(); }
function requireUser(req, res, next) { if (!req.session.user) return res.status(401).json({ error: 'سجل الدخول أولًا.' }); next(); }
function requireAdmin(req, res, next) { if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'هذه الصفحة للمدير فقط.' }); next(); }
function cleanUser(row) { return row && { id: row.id, name: row.name, email: row.email, role: row.role }; }
function validEmail(value) { return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) { const hash = crypto.scryptSync(password, salt, 64).toString('hex'); return `${salt}:${hash}`; }
function passwordMatches(password, stored) { const [salt, expected] = String(stored).split(':'); if (!salt || !expected) return false; const actual = Buffer.from(passwordHash(password, salt).split(':')[1], 'hex'); const expectedBuffer = Buffer.from(expected, 'hex'); return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer); }
function setSessionUser(req, row, res) { req.session.regenerate(err => { if (err) return res.status(500).json({ error: 'تعذر إنشاء الجلسة.' }); req.session.user = cleanUser(row); req.session.save(saveError => saveError ? res.status(500).json({ error: 'تعذر حفظ الجلسة.' }) : res.json({ user: req.session.user })); }); }

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  if (process.env.ADMIN_PASSWORD.length < 14) throw new Error('ADMIN_PASSWORD must contain at least 14 characters.');
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!existing) db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run('Nexora Admin', email, passwordHash(process.env.ADMIN_PASSWORD), 'admin');
  else db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);
}

app.use('/api', requireConfigured, sameOrigin);
app.get('/api/health', (_req, res) => res.json({ ok: true, paymentsConfigured: Boolean(stripe) }));
app.get('/api/products', (_req, res) => res.json({ products }));
app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80 || !validEmail(email) || typeof password !== 'string' || password.length < 10 || password.length > 128) return res.status(400).json({ error: 'تحقق من الاسم والبريد وكلمة المرور (10 أحرف على الأقل).' });
  try { const result = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(name.trim(), email.trim().toLowerCase(), passwordHash(password)); setSessionUser(req, db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid), res); }
  catch (error) { if (String(error.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'هذا البريد مسجل بالفعل.' }); throw error; }
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string' || password.length > 128) return res.status(400).json({ error: 'البريد أو كلمة المرور غير صحيحة.' });
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());
  if (!user || !passwordMatches(password, user.password_hash)) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة.' });
  setSessionUser(req, user, res);
});
app.post('/api/auth/logout', requireUser, (req, res) => req.session.destroy(err => { if (err) return res.status(500).json({ error: 'تعذر تسجيل الخروج.' }); res.clearCookie('nexora.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction }); res.json({ ok: true }); }));
app.get('/api/orders', requireUser, (req, res) => { const orders = db.prepare('SELECT id,items_json,total,currency,status,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.session.user.id).map(o => ({ id:o.id,items:JSON.parse(o.items_json),total:o.total,currency:o.currency,status:o.status,createdAt:o.created_at })); res.json({ orders }); });

app.post('/api/checkout/session', requireUser, async (req, res) => {
  if (!stripe || !process.env.BASE_URL) return res.status(503).json({ error: 'الدفع غير مهيأ بعد. أضف مفاتيح Stripe وBASE_URL إلى إعدادات الخادم.' });
  const items = req.body?.items, notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0,500) : '';
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) return res.status(400).json({ error: 'السلة غير صالحة.' });
  const orderItems = [];
  for (const item of items) {
    const product = products.find(p => p.id === item.productId), bundleIndex = Number(item.bundleIndex), quantity = Number(item.quantity), account = typeof item.account === 'string' ? item.account.trim().slice(0,100) : '';
    if (!product || !Number.isInteger(bundleIndex) || !product.bundles[bundleIndex] || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || (product.requiresAccount && account.length < 1)) return res.status(400).json({ error: 'تفاصيل أحد المنتجات غير صالحة.' });
    const bundle = product.bundles[bundleIndex]; orderItems.push({ productId:product.id,name:product.name,bundle:bundle.label,quantity,unitPrice:bundle.price,account });
  }
  const total = Number(orderItems.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0).toFixed(2));
  if (total <= 0 || total > 5000) return res.status(400).json({ error: 'قيمة الطلب غير صالحة.' });
  const inserted = db.prepare('INSERT INTO orders (user_id,email,items_json,notes,total) VALUES (?,?,?,?,?)').run(req.session.user.id,req.session.user.email,JSON.stringify(orderItems),notes,total);
  try {
    const checkout = await stripe.checkout.sessions.create({ mode:'payment', client_reference_id:String(inserted.lastInsertRowid), customer_email:req.session.user.email, line_items:orderItems.map(item=>({ quantity:item.quantity,price_data:{ currency:'sar',unit_amount:Math.round(item.unitPrice*100),product_data:{ name:`${item.name} — ${item.bundle}` } } })), metadata:{ orderId:String(inserted.lastInsertRowid),userId:String(req.session.user.id) }, success_url:`${process.env.BASE_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${process.env.BASE_URL}/?payment=cancelled` });
    db.prepare('UPDATE orders SET stripe_session_id=? WHERE id=?').run(checkout.id,inserted.lastInsertRowid); res.json({ url:checkout.url });
  } catch (error) { db.prepare('UPDATE orders SET status=? WHERE id=?').run('payment_error',inserted.lastInsertRowid); console.error('Stripe checkout error:',error.message); res.status(502).json({ error:'تعذر إنشاء جلسة الدفع. تحقق من إعدادات Stripe.' }); }
});

app.post('/api/webhooks/stripe', (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook unavailable');
  let event; try { event = stripe.webhooks.constructEvent(req.body,req.get('stripe-signature'),process.env.STRIPE_WEBHOOK_SECRET); } catch (err) { return res.status(400).send(`Invalid signature: ${err.message}`); }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') { const checkout=event.data.object; if (checkout.payment_status === 'paid') db.prepare("UPDATE orders SET status='paid' WHERE stripe_session_id=? AND status IN ('pending','payment_error')").run(checkout.id); }
  if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') { const checkout=event.data.object; db.prepare("UPDATE orders SET status='payment_failed' WHERE stripe_session_id=? AND status='pending'").run(checkout.id); }
  res.json({ received:true });
});
app.get('/api/admin/orders', requireUser, requireAdmin, (_req,res) => { const orders=db.prepare('SELECT id,email,items_json,total,currency,status,created_at FROM orders ORDER BY id DESC LIMIT 200').all().map(o=>({id:o.id,email:o.email,items:JSON.parse(o.items_json),total:o.total,currency:o.currency,status:o.status,createdAt:o.created_at})); res.json({orders}); });
app.patch('/api/admin/orders/:id', requireUser, requireAdmin, (req,res) => { const allowed=['pending','processing','fulfilled','cancelled']; const status=req.body?.status; if(!allowed.includes(status))return res.status(400).json({error:'حالة الطلب غير صالحة.'}); const result=db.prepare('UPDATE orders SET status=? WHERE id=? AND status IN (\'paid\',\'processing\',\'fulfilled\',\'pending\')').run(status,Number(req.params.id)); if(!result.changes)return res.status(404).json({error:'الطلب غير موجود أو حالته لا تسمح بالتعديل.'}); res.json({ok:true}); });
app.use(express.static(path.join(__dirname), { etag:true, maxAge:isProduction?'1h':0, index:'index.html' }));
app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({error:'حدث خطأ داخلي.'}); });
app.listen(port,()=>console.log(`Nexora running on ${port}`));
