import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;
if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set.");
}

const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

const execute = (sql, args = []) => db.execute({ sql, args });
const all = async (sql, args = []) => {
  const result = await execute(sql, args);
  return result.rows.map((row) => ({ ...row }));
};
const get = async (sql, args = []) => {
  const rows = await all(sql, args);
  return rows[0];
};
const run = async (sql, args = []) => {
  const result = await execute(sql, args);
  return {
    changes: Number(result.rowsAffected || 0),
    lastInsertRowid:
      result.lastInsertRowid == null ? null : Number(result.lastInsertRowid),
  };
};

async function initializeDatabase() {
  await db.executeMultiple(`
    create table if not exists users (
      id integer primary key autoincrement,
      name text,
      email text unique,
      hash text
    );
    create table if not exists tasks (
      id integer primary key autoincrement,
      title text not null,
      category text default 'study',
      priority text default 'medium',
      due text,
      est_min integer default 30,
      done integer default 0,
      notes text default '',
      subtasks text default '[]',
      user_id integer
    );
    create table if not exists sessions (
      id integer primary key autoincrement,
      task_id integer,
      minutes integer not null,
      day text default (date('now')),
      user_id integer
    );
    create table if not exists items (
      id integer primary key autoincrement,
      kind text not null,
      title text not null,
      due text,
      progress integer default 0,
      body text default '',
      user_id integer
    );
    create table if not exists activity (
      id integer primary key autoincrement,
      text text,
      at text default (datetime('now')),
      user_id integer
    );
    create table if not exists chat (
      id integer primary key autoincrement,
      role text,
      text text,
      user_id integer
    );
  `);
}

const pad = (n) => String(n).padStart(2, "0");
const ld = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const log = (uid, message) =>
  run("insert into activity(user_id,text) values(?,?)", [uid, message]);

const app = express();
app.use(cors(), express.json());

const SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== "production" ? "floof-dev-secret" : null);
if (!SECRET) throw new Error("JWT_SECRET must be set in production.");

const sign = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: "30d" });
const pub = (u) => ({ id: u.id, name: u.name, email: u.email });
const asyncRoute = (handler) => (q, r, next) =>
  Promise.resolve(handler(q, r, next)).catch(next);

// ---------- auth ----------
app.post(
  "/api/auth/signup",
  asyncRoute(async (q, r) => {
    const { name, email, password } = q.body;
    if (!name || !email || !password || password.length < 6) {
      return r.status(400).json({
        error: "need a name, an email and a password with 6+ characters",
      });
    }

    const mail = email.toLowerCase().trim();
    if (await get("select 1 from users where email=?", [mail])) {
      return r
        .status(409)
        .json({ error: "that email already has a Floof. try logging in" });
    }

    const first = !(await get("select 1 from users limit 1"));
    const inserted = await run(
      "insert into users(name,email,hash) values(?,?,?)",
      [name.trim(), mail, bcrypt.hashSync(password, 10)],
    );
    const id = inserted.lastInsertRowid;

    if (first) {
      for (const table of ["tasks", "sessions", "items", "activity", "chat"]) {
        await run(`update ${table} set user_id=? where user_id is null`, [id]);
      }
    }

    const user = await get("select * from users where id=?", [id]);
    return r.json({ token: sign(user), user: pub(user) });
  }),
);

app.post(
  "/api/auth/login",
  asyncRoute(async (q, r) => {
    const user = await get("select * from users where email=?", [
      (q.body.email || "").toLowerCase().trim(),
    ]);
    if (!user || !bcrypt.compareSync(q.body.password || "", user.hash)) {
      return r
        .status(400)
        .json({ error: "wrong email or password. floof is not judging" });
    }
    return r.json({ token: sign(user), user: pub(user) });
  }),
);

app.use("/api", (q, r, next) => {
  try {
    q.uid = jwt.verify((q.headers.authorization || "").slice(7), SECRET).id;
    next();
  } catch {
    r.sendStatus(401);
  }
});

app.get(
  "/api/me",
  asyncRoute(async (q, r) => {
    const user = await get("select * from users where id=?", [q.uid]);
    return user ? r.json(pub(user)) : r.sendStatus(401);
  }),
);

// ---------- tasks ----------
app.get(
  "/api/tasks",
  asyncRoute(async (q, r) => {
    return r.json(
      await all(
        "select * from tasks where user_id=? order by done, due is null, due",
        [q.uid],
      ),
    );
  }),
);

app.post(
  "/api/tasks",
  asyncRoute(async (q, r) => {
    const {
      title,
      category = "study",
      priority = "medium",
      due = null,
      est_min = 30,
    } = q.body;
    if (!title) return r.status(400).json({ error: "title needed" });

    const inserted = await run(
      "insert into tasks(user_id,title,category,priority,due,est_min) values(?,?,?,?,?,?)",
      [q.uid, title, category, priority, due, est_min],
    );
    await log(q.uid, `Added "${title}"`);
    return r.json(
      await get("select * from tasks where id=?", [inserted.lastInsertRowid]),
    );
  }),
);

app.patch(
  "/api/tasks/:id",
  asyncRoute(async (q, r) => {
    const task = await get("select * from tasks where id=? and user_id=?", [
      q.params.id,
      q.uid,
    ]);
    if (!task) return r.sendStatus(404);

    const updated = { ...task, ...q.body };
    const subtasks =
      typeof updated.subtasks === "string"
        ? updated.subtasks
        : JSON.stringify(updated.subtasks ?? []);
    await run(
      "update tasks set title=?,category=?,priority=?,due=?,est_min=?,done=?,notes=?,subtasks=? where id=? and user_id=?",
      [
        updated.title,
        updated.category,
        updated.priority,
        updated.due,
        updated.est_min,
        updated.done ? 1 : 0,
        updated.notes ?? "",
        subtasks,
        task.id,
        q.uid,
      ],
    );
    if (q.body.done === true) await log(q.uid, `Completed "${task.title}"`);
    return r.json({ ...updated, subtasks });
  }),
);

app.delete(
  "/api/tasks/:id",
  asyncRoute(async (q, r) => {
    await run("delete from tasks where id=? and user_id=?", [
      q.params.id,
      q.uid,
    ]);
    return r.sendStatus(204);
  }),
);

// ---------- sessions & stats ----------
app.post(
  "/api/sessions",
  asyncRoute(async (q, r) => {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(q.body.day || "")
      ? q.body.day
      : ld(new Date());
    await run(
      "insert into sessions(user_id,task_id,minutes,day) values(?,?,?,?)",
      [q.uid, q.body.task_id ?? null, q.body.minutes, day],
    );
    await log(q.uid, `Focused for ${q.body.minutes} min`);
    return r.sendStatus(201);
  }),
);

app.get(
  "/api/stats",
  asyncRoute(async (q, r) => {
    const from = ld(new Date(Date.now() - 6 * 864e5));
    const rows = await all(
      "select s.day, coalesce(t.category,'general') c, sum(s.minutes) m from sessions s left join tasks t on t.id=s.task_id where s.user_id=? and s.day >= ? group by s.day, c",
      [q.uid, from],
    );
    const cats = [...new Set(rows.map((row) => row.c))];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 864e5);
      const key = ld(date);
      const entry = {
        day: date.toLocaleDateString("en", { weekday: "short" }),
        total: 0,
      };
      rows
        .filter((row) => row.day === key)
        .forEach((row) => {
          entry[row.c] = Number(row.m);
          entry.total += Number(row.m);
        });
      days.push(entry);
    }
    return r.json({ days, cats });
  }),
);

// ---------- items (projects, exams, assignments, goals, notes) ----------
app.get(
  "/api/items",
  asyncRoute(async (q, r) => {
    return r.json(
      await all(
        "select * from items where user_id=? order by due is null, due",
        [q.uid],
      ),
    );
  }),
);

app.post(
  "/api/items",
  asyncRoute(async (q, r) => {
    const { kind, title, due = null, body = "" } = q.body;
    if (!kind || !title)
      return r.status(400).json({ error: "kind and title needed" });

    const inserted = await run(
      "insert into items(user_id,kind,title,due,body) values(?,?,?,?,?)",
      [q.uid, kind, title, due, body],
    );
    await log(q.uid, `Added ${kind} "${title}"`);
    return r.json(
      await get("select * from items where id=?", [inserted.lastInsertRowid]),
    );
  }),
);

app.patch(
  "/api/items/:id",
  asyncRoute(async (q, r) => {
    const item = await get("select * from items where id=? and user_id=?", [
      q.params.id,
      q.uid,
    ]);
    if (!item) return r.sendStatus(404);

    const updated = { ...item, ...q.body };
    await run(
      "update items set title=?,due=?,progress=?,body=? where id=? and user_id=?",
      [
        updated.title,
        updated.due,
        updated.progress,
        updated.body ?? "",
        item.id,
        q.uid,
      ],
    );
    return r.json(updated);
  }),
);

app.delete(
  "/api/items/:id",
  asyncRoute(async (q, r) => {
    await run("delete from items where id=? and user_id=?", [
      q.params.id,
      q.uid,
    ]);
    return r.sendStatus(204);
  }),
);

app.get(
  "/api/activity",
  asyncRoute(async (q, r) => {
    return r.json(
      await all(
        "select * from activity where user_id=? order by id desc limit 6",
        [q.uid],
      ),
    );
  }),
);

// ---------- Ask Floof (Gemma) ----------

const PERSONA = `
You are Floof, a tiny academic best friend living inside a study app.

PERSONALITY:
- Warm, affectionate, playful and slightly chaotic.
- Witty, but never rude, dismissive or unnecessarily sarcastic.
- Speak naturally, like a close friend.
- Be honest when a schedule is unrealistic.
- Never sound corporate or like a motivational poster.

EMOTIONAL INTELLIGENCE:
- Notice when the user is stressed, anxious, sad or frustrated.
- Respond with empathy before giving advice.
- Never mock the user's struggles or make them feel guilty.
- When they are overwhelmed, help them slow down and focus on one thing.
- Offer reassurance without being overly dramatic.

STUDY BUDDY:
- Help prioritise exams, assignments, projects and deadlines.
- Break overwhelming workloads into small, realistic steps.
- Consider the user's available time and existing tasks.
- Never invent deadlines or syllabus information.
- Encourage breaks and realistic expectations.

CONVERSATION:
- Answer what the user actually asks.
- Keep replies under 80 words.
- Don't turn every conversation into a productivity plan.
- Don't repeat generic motivational phrases.
- Use a little humour when appropriate, never at the user's expense.
- No emojis.
- Only create tasks when the user requests a plan or clearly wants help organising work.

Your purpose is to make the user feel understood, supported and less overwhelmed.
`;

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

app.get(
  "/api/chat",
  asyncRoute(async (q, r) => {
    const messages = await all(
      "select * from chat where user_id=? order by id desc limit 30",
      [q.uid],
    );
    return r.json(messages.reverse());
  }),
);

app.delete(
  "/api/chat",
  asyncRoute(async (q, r) => {
    await run("delete from chat where user_id=?", [q.uid]);
    return r.sendStatus(204);
  }),
);

app.post(
  "/api/chat",
  asyncRoute(async (q, r) => {
    const message = (q.body.text || "").trim();
    if (!message) return r.sendStatus(400);

    await run("insert into chat(user_id,role,text) values(?,'user',?)", [
      q.uid,
      message,
    ]);

    let reply = "My brain is taking a tiny nap. Please check back in a moment.";
    let plan = [];

    if (!ai) {
      reply =
        "I am awake, but my AI connection is not configured yet. Please check my API settings.";
    } else {
      const history = (
        await all(
          "select role,text from chat where user_id=? order by id desc limit 8",
          [q.uid],
        )
      )
        .reverse()
        .slice(0, -1)
        .map((row) => `${row.role === "user" ? "User" : "Floof"}: ${row.text}`);

      const tasks = await all(
        "select title,priority,due,est_min from tasks where user_id=? and done=0",
        [q.uid],
      );

      const items = await all(
        "select kind,title,due,progress from items where user_id=?",
        [q.uid],
      );

      try {
        const result = await ai.models.generateContent({
          model: process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it",
          contents: `
${PERSONA}

Today: ${new Date().toDateString()}

Open tasks:
${JSON.stringify(tasks)}

Exams, assignments, goals and projects:
${JSON.stringify(items)}

Recent conversation:
${history}

Latest user message:
${message}

Return ONLY valid JSON in this exact structure:
{
  "reply": "Your conversational response",
  "tasks": []
}

If the user requests a study plan, tasks must contain 0-6 concrete tasks.
Each task must have title, est_min and priority.
Otherwise return an empty tasks array.
`,
        });

        const raw = result.text || "";

        // Extract JSON even if the model adds surrounding text.
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");

        if (start !== -1 && end > start) {
          const parsed = JSON.parse(raw.slice(start, end + 1));

          if (typeof parsed.reply === "string" && parsed.reply.trim()) {
            reply = parsed.reply.trim();
          }

          if (Array.isArray(parsed.tasks)) {
            plan = parsed.tasks
              .filter(
                (task) =>
                  task && typeof task.title === "string" && task.title.trim(),
              )
              .slice(0, 6)
              .map((task) => ({
                title: task.title.trim(),
                est_min: Math.max(5, Number(task.est_min) || 30),
                priority: ["low", "medium", "high"].includes(task.priority)
                  ? task.priority
                  : "medium",
              }));
          }
        } else if (raw.trim()) {
          reply = raw.trim().slice(0, 2000);
        }
      } catch (error) {
        console.error("Ask Floof error:", error);

        reply =
          "Something went wrong while I was thinking. Give me another try in a moment.";
      }
    }

    await run("insert into chat(user_id,role,text) values(?,'gemma',?)", [
      q.uid,
      reply,
    ]);

    const messages = (
      await all("select * from chat where user_id=? order by id desc limit 2", [
        q.uid,
      ])
    ).reverse();

    return r.json({ messages, tasks: plan });
  }),
);

// Serve the built React app from the same origin as the API.
const dist = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../client/dist",
);
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_q, r) => r.sendFile(path.join(dist, "index.html")));
}

app.use((error, _q, r, _next) => {
  console.error(error);
  if (r.headersSent) return;
  return r
    .status(500)
    .json({ error: "Something went wrong. Please try again." });
});

const port = process.env.PORT || 5000;
initializeDatabase()
  .then(() =>
    app.listen(port, () => console.log(`Floof server up on port ${port}`)),
  )
  .catch((error) => {
    console.error("Could not initialize the Turso database:", error);
    process.exit(1);
  });
