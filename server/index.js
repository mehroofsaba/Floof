import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const db = new Database('floof.db');
db.exec(`
create table if not exists users(id integer primary key autoincrement,name text,email text unique,hash text);
create table if not exists tasks(id integer primary key autoincrement,title text not null,category text default 'study',priority text default 'medium',due text,est_min integer default 30,done integer default 0);
create table if not exists sessions(id integer primary key autoincrement,task_id integer,minutes integer not null,day text default (date('now')));
create table if not exists items(id integer primary key autoincrement,kind text not null,title text not null,due text,progress integer default 0);
create table if not exists activity(id integer primary key autoincrement,text text,at text default (datetime('now')));
create table if not exists chat(id integer primary key autoincrement,role text,text text);`);
for (const [t, c] of [['tasks', "notes text default ''"], ['tasks', "subtasks text default '[]'"], ['items', "body text default ''"], ['tasks', 'user_id integer'], ['sessions', 'user_id integer'], ['items', 'user_id integer'], ['activity', 'user_id integer'], ['chat', 'user_id integer']]) {
  try { db.exec(`alter table ${t} add column ${c}`); } catch {}
}
const pad = n => String(n).padStart(2, '0');
const ld = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const log = (uid, text) => db.prepare('insert into activity(user_id,text) values(?,?)').run(uid, text);

const app = express();
app.use(cors(), express.json());

// ---------- auth ----------
const SECRET = process.env.JWT_SECRET || 'floof-dev-secret';
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' });
const pub = u => ({ id: u.id, name: u.name, email: u.email });
app.post('/api/auth/signup', (q, r) => {
  const { name, email, password } = q.body;
  if (!name || !email || !password || password.length < 6) return r.status(400).json({ error: 'need a name, an email and a password with 6+ characters' });
  const mail = email.toLowerCase().trim();
  if (db.prepare('select 1 from users where email=?').get(mail)) return r.status(409).json({ error: 'that email already has a Floof. try logging in' });
  const first = !db.prepare('select 1 from users').get();
  const id = db.prepare('insert into users(name,email,hash) values(?,?,?)').run(name.trim(), mail, bcrypt.hashSync(password, 10)).lastInsertRowid;
  if (first) for (const t of ['tasks', 'sessions', 'items', 'activity', 'chat']) db.prepare(`update ${t} set user_id=? where user_id is null`).run(id);
  const u = db.prepare('select * from users where id=?').get(id);
  r.json({ token: sign(u), user: pub(u) });
});
app.post('/api/auth/login', (q, r) => {
  const u = db.prepare('select * from users where email=?').get((q.body.email || '').toLowerCase().trim());
  if (!u || !bcrypt.compareSync(q.body.password || '', u.hash)) return r.status(400).json({ error: 'wrong email or password. floof is not judging' });
  r.json({ token: sign(u), user: pub(u) });
});
app.use('/api', (q, r, n) => {
  try { q.uid = jwt.verify((q.headers.authorization || '').slice(7), SECRET).id; n(); } catch { r.sendStatus(401); }
});
app.get('/api/me', (q, r) => { const u = db.prepare('select * from users where id=?').get(q.uid); u ? r.json(pub(u)) : r.sendStatus(401); });

// ---------- tasks ----------
app.get('/api/tasks', (q, r) => r.json(db.prepare('select * from tasks where user_id=? order by done, due is null, due').all(q.uid)));
app.post('/api/tasks', (q, r) => {
  const { title, category = 'study', priority = 'medium', due = null, est_min = 30 } = q.body;
  if (!title) return r.status(400).json({ error: 'title needed' });
  const id = db.prepare('insert into tasks(user_id,title,category,priority,due,est_min) values(?,?,?,?,?,?)').run(q.uid, title, category, priority, due, est_min).lastInsertRowid;
  log(q.uid, `Added "${title}"`);
  r.json(db.prepare('select * from tasks where id=?').get(id));
});
app.patch('/api/tasks/:id', (q, r) => {
  const t = db.prepare('select * from tasks where id=? and user_id=?').get(q.params.id, q.uid);
  if (!t) return r.sendStatus(404);
  const n = { ...t, ...q.body };
  const subs = typeof n.subtasks === 'string' ? n.subtasks : JSON.stringify(n.subtasks);
  db.prepare('update tasks set title=?,category=?,priority=?,due=?,est_min=?,done=?,notes=?,subtasks=? where id=?').run(n.title, n.category, n.priority, n.due, n.est_min, n.done ? 1 : 0, n.notes, subs, t.id);
  if (q.body.done === true) log(q.uid, `Completed "${t.title}"`);
  r.json({ ...n, subtasks: subs });
});
app.delete('/api/tasks/:id', (q, r) => { db.prepare('delete from tasks where id=? and user_id=?').run(q.params.id, q.uid); r.sendStatus(204); });

// ---------- sessions & stats ----------
app.post('/api/sessions', (q, r) => {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(q.body.day || '') ? q.body.day : ld(new Date());
  db.prepare('insert into sessions(user_id,task_id,minutes,day) values(?,?,?,?)').run(q.uid, q.body.task_id ?? null, q.body.minutes, day);
  log(q.uid, `Focused for ${q.body.minutes} min`);
  r.sendStatus(201);
});
app.get('/api/stats', (q, r) => {
  const from = ld(new Date(Date.now() - 6 * 864e5));
  const rows = db.prepare("select s.day, coalesce(t.category,'general') c, sum(s.minutes) m from sessions s left join tasks t on t.id=s.task_id where s.user_id=? and s.day >= ? group by s.day, c").all(q.uid, from);
  const cats = [...new Set(rows.map(x => x.c))];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5), key = ld(d);
    const o = { day: d.toLocaleDateString('en', { weekday: 'short' }), total: 0 };
    rows.filter(x => x.day === key).forEach(x => { o[x.c] = x.m; o.total += x.m; });
    days.push(o);
  }
  r.json({ days, cats });
});

// ---------- items (projects, exams, assignments, goals, notes) ----------
app.get('/api/items', (q, r) => r.json(db.prepare('select * from items where user_id=? order by due is null, due').all(q.uid)));
app.post('/api/items', (q, r) => {
  const { kind, title, due = null, body = '' } = q.body;
  if (!kind || !title) return r.status(400).json({ error: 'kind and title needed' });
  const id = db.prepare('insert into items(user_id,kind,title,due,body) values(?,?,?,?,?)').run(q.uid, kind, title, due, body).lastInsertRowid;
  log(q.uid, `Added ${kind} "${title}"`);
  r.json(db.prepare('select * from items where id=?').get(id));
});
app.patch('/api/items/:id', (q, r) => {
  const t = db.prepare('select * from items where id=? and user_id=?').get(q.params.id, q.uid);
  if (!t) return r.sendStatus(404);
  const n = { ...t, ...q.body };
  db.prepare('update items set title=?,due=?,progress=?,body=? where id=?').run(n.title, n.due, n.progress, n.body ?? '', t.id);
  r.json(n);
});
app.delete('/api/items/:id', (q, r) => { db.prepare('delete from items where id=? and user_id=?').run(q.params.id, q.uid); r.sendStatus(204); });
app.get('/api/activity', (q, r) => r.json(db.prepare('select * from activity where user_id=? order by id desc limit 6').all(q.uid)));

// ---------- Ask Floof (Gemma) ----------
const PERSONA = `You are Floof, a tiny academic best friend living inside a study app. Casual, warm, a little unhinged, honest when a schedule is unrealistic. Never corporate or motivational-poster. No emojis. Replies under 80 words. Use the user's real tasks and deadlines below. If they have limited time and several subjects, make a realistic plan with small concrete steps.`;
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
app.get('/api/chat', (q, r) => r.json(db.prepare('select * from chat where user_id=? order by id desc limit 30').all(q.uid).reverse()));
app.delete('/api/chat', (q, r) => { db.prepare('delete from chat where user_id=?').run(q.uid); r.sendStatus(204); });
app.post('/api/chat', async (q, r) => {
  const text = (q.body.text || '').trim();
  if (!text) return r.sendStatus(400);
  db.prepare("insert into chat(user_id,role,text) values(?,'user',?)").run(q.uid, text);
  let reply = 'No API key yet. Add GEMINI_API_KEY to server/.env and I will wake up.', plan = [];
  if (ai) {
    const hist = db.prepare('select role,text from chat where user_id=? order by id desc limit 8').all(q.uid).reverse().map(m => `${m.role === 'user' ? 'User' : 'Floof'}: ${m.text}`).join('\n');
    const tasks = db.prepare('select title,priority,due,est_min from tasks where user_id=? and done=0').all(q.uid);
    const items = db.prepare('select kind,title,due,progress from items where user_id=?').all(q.uid);
    try {
      const res = await ai.models.generateContent({ model: process.env.GEMMA_MODEL, contents: `${PERSONA}\nToday: ${new Date().toDateString()}\nOpen tasks: ${JSON.stringify(tasks)}\nExams, assignments, goals, projects: ${JSON.stringify(items)}\nConversation:\n${hist}\nReply ONLY with JSON, no markdown: {"reply":"short Floof-style answer","tasks":[{"title":"","est_min":30,"priority":"medium"}]}. Put 0-6 concrete new tasks in "tasks" only when the user wants a plan.` });
      try { const o = JSON.parse(res.text.match(/\{[\s\S]*\}/)[0]); reply = o.reply; plan = Array.isArray(o.tasks) ? o.tasks.slice(0, 6) : []; } catch { reply = res.text; }
    } catch (e) { console.error(e.message); reply = 'Gemma tripped over a cable. Try again?'; }
  }
  db.prepare("insert into chat(user_id,role,text) values(?,'gemma',?)").run(q.uid, reply);
  r.json({ messages: db.prepare('select * from chat where user_id=? order by id desc limit 2').all(q.uid).reverse(), tasks: plan });
});

// serve built frontend when it exists (used for deployment)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_q, r) => r.sendFile(path.join(dist, 'index.html'))); }
app.listen(process.env.PORT || 5000, () => console.log('floof server up'));
