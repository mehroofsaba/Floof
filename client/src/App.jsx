import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  CalendarDays,
  ListChecks,
  Target,
  Sparkles,
  Settings,
  Search,
  Bell,
  Plus,
  Play,
  Pause,
  Square,
  Check,
  ChevronLeft,
  ChevronRight,
  Timer,
  BarChart3,
  BookOpen,
  FileText,
  StickyNote,
  Trash2,
  Layers,
  Send,
  LogOut,
  Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import Mascot, { Sparkle, Bunny, Desk } from "./Mascot.jsx";
import { Select, DatePicker, Modal } from "./ui.jsx";

const tok = () => localStorage.getItem("floofToken");
const api = (u, o = {}) =>
  fetch("/api" + u, {
    method: o.method,
    headers: {
      "Content-Type": "application/json",
      ...(tok() ? { Authorization: "Bearer " + tok() } : {}),
    },
    body: o.body && JSON.stringify(o.body),
  }).then((r) => {
    if (r.status === 401) {
      localStorage.removeItem("floofToken");
      window.dispatchEvent(new Event("floof-logout"));
      throw new Error("401");
    }
    return r.status === 204 ? null : r.json();
  });
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const left = (d) => {
  const n = Math.round(
    (new Date(d + "T00:00") - new Date(iso(new Date()) + "T00:00")) / 864e5,
  );
  return n < 0
    ? "overdue"
    : n === 0
      ? "today"
      : n === 1
        ? "tomorrow"
        : n + " days left";
};
const PRI = { high: "#f7b6c2", medium: "#fbe3a6", low: "#c9ecd3" };
const COLORS = [
  "#f7b6c2",
  "#cdb8f0",
  "#fcd5b0",
  "#fbe3a6",
  "#c9ecd3",
  "#bfe0f5",
  "#d9efb8",
];
const KCOL = {
  task: "#d9c9f5",
  exam: "#f7b6c2",
  assignment: "#fbe3a6",
  project: "#c9ecd3",
  goal: "#bfe0f5",
};
const CFG = {
  project: {
    t: "Projects",
    I: Layers,
    due: 1,
    prog: 1,
    empty: "no projects yet. that is a dangerously large amount of free time.",
    ph: "name a project",
  },
  exam: {
    t: "Exams",
    I: BookOpen,
    due: 1,
    prog: 1,
    empty: "no exams lurking around. suspicious, but nice.",
    ph: "add an exam",
  },
  assignment: {
    t: "Assignments",
    I: FileText,
    due: 1,
    prog: 1,
    empty: "enjoy this rare moment of peace.",
    ph: "add an assignment",
  },
  goal: {
    t: "Goals",
    I: Target,
    due: 0,
    prog: 1,
    empty: "add something ridiculous enough to chase.",
    ph: "a goal worth chasing",
  },
  note: {
    t: "Notes",
    I: StickyNote,
    due: 0,
    prog: 0,
    empty: "a blank page. say something dramatic.",
    ph: "note title",
  },
};
const NAV = [
  [
    "Daily",
    [
      ["Home", Home],
      ["Today", ListChecks],
      ["Calendar", CalendarDays],
    ],
  ],
  [
    "Study",
    [
      ["Projects", Layers],
      ["Exams", BookOpen],
      ["Assignments", FileText],
      ["Goals", Target],
    ],
  ],
  ["Personal", [["Notes", StickyNote]]],
  [
    "Floof",
    [
      ["Ask Floof", Sparkles],
      ["Settings", Settings],
    ],
  ],
];
const quip = (n) =>
  n === 0
    ? "nothing left. suspiciously productive. go touch grass."
    : n === 1
      ? "one tiny task. we can absolutely bully this thing into completion."
      : n > 6
        ? "okay. who gave you all these tasks."
        : `${n} things left. we can absolutely bully these into submission.`;
const PRIS = [
  ["high", "high"],
  ["medium", "medium"],
  ["low", "low"],
];

function Card({ title, icon: I, children, className = "", right }) {
  return (
    <motion.section
      className={"card " + className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {title && (
        <header>
          <h3>
            {I && <I size={18} />} {title}
          </h3>
          {right}
        </header>
      )}
      {children}
    </motion.section>
  );
}
const Burst = () => (
  <>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <motion.i
        key={i}
        className="burst"
        style={{ background: COLORS[i] }}
        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        animate={{
          x: Math.cos(i * 1.05) * 24,
          y: Math.sin(i * 1.05) * 24,
          opacity: 0,
          scale: 0.4,
        }}
        transition={{ duration: 0.6 }}
      />
    ))}
  </>
);

/* ---------- login ---------- */
function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/auth/" + mode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    })
      .then((r) => r.json())
      .catch(() => ({ error: "cannot reach the server. is it running?" }));
    setBusy(false);
    if (r.error) return setErr(r.error);
    localStorage.setItem("floofToken", r.token);
    onAuth(r.user);
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="authpage">
      <Sparkle
        c="#f7b6c2"
        s={20}
        style={{ position: "absolute", top: "18%", left: "30%" }}
      />
      <Sparkle
        s={14}
        style={{ position: "absolute", top: "70%", right: "28%" }}
      />
      <motion.form
        className="card hero authcard"
        onSubmit={go}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Desk mood="happy" />
        <h1>Floof</h1>
        <p className="muted">
          {mode === "login"
            ? "welcome back. i kept your seat warm."
            : "hi! let us get your life together. gently."}
        </p>
        {mode === "signup" && (
          <input
            placeholder="what should I call you?"
            value={f.name}
            onChange={set("name")}
          />
        )}
        <input
          type="email"
          placeholder="email"
          value={f.email}
          onChange={set("email")}
        />
        <input
          type="password"
          placeholder="password (6+ characters)"
          value={f.password}
          onChange={set("password")}
        />
        {err && <p className="err">{err}</p>}
        <button className="btn big" disabled={busy}>
          {busy ? "..." : mode === "login" ? "Log in" : "Create my Floof"}
        </button>
        <button
          type="button"
          className="linkbtn"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setErr("");
          }}
        >
          {mode === "login"
            ? "new here? make an account"
            : "already have one? log in"}
        </button>
      </motion.form>
    </div>
  );
}

/* ---------- today ---------- */
function Tasks({ tasks, reload, projects, onCelebrate }) {
  const [t, setT] = useState("");
  const [pri, setPri] = useState("medium");
  const [cat, setCat] = useState("study");
  const [open, setOpen] = useState(null);
  const [burst, setBurst] = useState(null);
  const [sub, setSub] = useState("");
  const today = iso(new Date());
  const openCount = tasks.filter((x) => !x.done);
  const cats = ["study", "work", "personal", ...projects].map((c) => [c, c]);
  const patch = async (id, b) => {
    await api("/tasks/" + id, { method: "PATCH", body: b });
    reload();
  };
  const toggle = async (x) => {
    await patch(x.id, { done: !x.done });
    if (!x.done) {
      setBurst(x.id);
      setTimeout(() => setBurst(null), 700);
      onCelebrate();
    }
  };
  const add = async (e) => {
    e.preventDefault();
    if (!t.trim()) return;
    await api("/tasks", {
      method: "POST",
      body: { title: t, priority: pri, category: cat, due: today },
    });
    setT("");
    reload();
  };
  const subs = (x) => {
    try {
      return JSON.parse(x.subtasks || "[]");
    } catch {
      return [];
    }
  };
  return (
    <Card
      title="Today"
      icon={ListChecks}
      className="hero"
      right={
        <span className="num muted">
          {new Date().toLocaleDateString("en", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </span>
      }
    >
      <div className="pill-row">
        <b>{openCount.length}</b> tasks <i>·</i>{" "}
        <b>{openCount.filter((x) => x.due && x.due <= today).length}</b> due{" "}
        <i>·</i>{" "}
        <b>
          {Math.round(openCount.reduce((a, x) => a + x.est_min, 0) / 6) / 10}h
        </b>{" "}
        planned
      </div>
      <p className="floofsay">{quip(openCount.length)}</p>
      <AnimatePresence>
        {tasks.map((x) => (
          <motion.div
            key={x.id}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className={"task" + (x.done ? " done" : "")}>
              <span className="checkwrap">
                <motion.button
                  whileTap={{ scale: 0.7 }}
                  className="check"
                  onClick={() => toggle(x)}
                >
                  {x.done && (
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                    >
                      <Check size={14} />
                    </motion.span>
                  )}
                </motion.button>
                {burst === x.id && <Burst />}
              </span>
              <span
                className="ttl"
                onClick={() => setOpen(open === x.id ? null : x.id)}
              >
                {x.title}
                {x.due && x.due < today && !x.done && (
                  <em className="late">aging like milk</em>
                )}
              </span>
              <span className="tag soft">{x.category}</span>
              <span className="tag" style={{ background: PRI[x.priority] }}>
                {x.priority}
              </span>
              <span className="num muted">{x.est_min}m</span>
              <button
                className="ic trash"
                onClick={async () => {
                  await api("/tasks/" + x.id, { method: "DELETE" });
                  reload();
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            {open === x.id && (
              <div className="detail">
                <input
                  defaultValue={x.title}
                  onBlur={(e) =>
                    e.target.value && patch(x.id, { title: e.target.value })
                  }
                />
                <textarea
                  defaultValue={x.notes}
                  placeholder="description (optional)"
                  onBlur={(e) => patch(x.id, { notes: e.target.value })}
                />
                <div className="row wrap">
                  <Clock size={14} />
                  <input
                    type="number"
                    min="5"
                    step="5"
                    defaultValue={x.est_min}
                    style={{ width: 76 }}
                    onBlur={(e) => patch(x.id, { est_min: +e.target.value })}
                  />
                  <span className="muted sm">min</span>
                  <Select
                    value={x.category}
                    options={cats}
                    onChange={(v) => patch(x.id, { category: v })}
                  />
                  <DatePicker
                    value={x.due || ""}
                    onChange={(v) => patch(x.id, { due: v || null })}
                  />
                </div>
                {subs(x).map((s, i) => (
                  <label key={i} className="sub">
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() =>
                        patch(x.id, {
                          subtasks: subs(x).map((y, j) =>
                            j === i ? { ...y, done: !y.done } : y,
                          ),
                        })
                      }
                    />{" "}
                    <span
                      style={{
                        textDecoration: s.done ? "line-through" : "none",
                      }}
                    >
                      {s.t}
                    </span>
                  </label>
                ))}
                <form
                  className="add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (sub) {
                      patch(x.id, {
                        subtasks: [...subs(x), { t: sub, done: false }],
                      });
                      setSub("");
                    }
                  }}
                >
                  <input
                    value={sub}
                    onChange={(e) => setSub(e.target.value)}
                    placeholder="add a subtask..."
                  />
                  <button className="btn soft">
                    <Plus size={14} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <form onSubmit={add} className="add">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="add a task, small is fine..."
        />
        <Select value={cat} options={cats} onChange={setCat} />
        <Select value={pri} options={PRIS} onChange={setPri} />
        <button className="btn">
          <Plus size={16} /> Add
        </button>
      </form>
    </Card>
  );
}

/* ---------- ask floof ---------- */
const IDEAS = [
  "I have 2 hours and 3 subjects",
  "plan my day realistically",
  "what should I do first?",
];
function AskFloof({ reload, say, tall }) {
  const [msgs, setMsgs] = useState([]);
  const [plan, setPlan] = useState([]);
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef();
  useEffect(() => {
    api("/chat").then(setMsgs);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, plan]);
  const send = async (text) => {
    if (!text.trim() || busy) return;
    setT("");
    setBusy(true);
    setPlan([]);
    setMsgs((m) => [...m, { id: "tmp", role: "user", text }]);
    const r = await api("/chat", { method: "POST", body: { text } });
    setMsgs((m) => [...m.filter((x) => x.id !== "tmp"), ...r.messages]);
    setPlan(r.tasks || []);
    setBusy(false);
  };
  const start = async () => {
    for (const p of plan)
      await api("/tasks", {
        method: "POST",
        body: {
          title: p.title,
          priority: p.priority || "medium",
          est_min: p.est_min || 30,
          due: iso(new Date()),
        },
      });
    setPlan([]);
    say("plan added to Today. no take-backs.");
    reload();
  };
  return (
    <Card
      title="Ask Floof"
      icon={Sparkles}
      className="ask"
      right={
        <span className="sm muted">
          powered by Gemma{" "}
          <button
            className="ic"
            title="clear chat"
            onClick={async () => {
              await api("/chat", { method: "DELETE" });
              setMsgs([]);
              setPlan([]);
            }}
          >
            <Trash2 size={13} />
          </button>
        </span>
      }
    >
      <div className={"msgs" + (tall ? " tall" : "")}>
        {msgs.length === 0 && (
          <div className="intro">
            <Mascot size={54} />
            <div>
              <p>
                tell me what is on your plate and how much time you have. i will
                make it less scary.
              </p>
              <div className="row wrap">
                {IDEAS.map((i) => (
                  <button key={i} className="chip" onClick={() => send(i)}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={"msg " + m.role}>
            {m.role !== "user" && <Mascot size={28} />}
            <p>{m.text}</p>
          </div>
        ))}
        {busy && (
          <div className="msg gemma">
            <Mascot size={28} mood="focus" />
            <p className="muted">thinking, very hard...</p>
          </div>
        )}
        {plan.length > 0 && (
          <div className="plan">
            {plan.map((p, i) => (
              <div key={i} className="sub">
                {i + 1}. {p.title}{" "}
                <span className="num muted">{p.est_min || 30}m</span>
              </div>
            ))}
            <button className="btn" onClick={start}>
              Start this plan
            </button>
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(t);
        }}
        className="add"
      >
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="ask me anything about your day..."
        />
        <button className="btn">
          <Send size={14} />
        </button>
      </form>
    </Card>
  );
}

/* ---------- focus ---------- */
function Focus({ tasks, onDone, onRun, onCelebrate, say }) {
  const [mins, setMins] = useState(30);
  const [left, setLeft] = useState(30 * 60);
  const [run, setRun] = useState(false);
  const [task, setTask] = useState("");
  const [cheer, setCheer] = useState("clean your mind, get things done.");
  useEffect(() => {
    onRun(run);
  }, [run]);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [run]);
  useEffect(() => {
    if (run && left <= 0) finish(true);
  }, [left]);
  const pick = (m) => {
    setMins(m);
    setLeft(m * 60);
    setRun(false);
  };
  const finish = async (full) => {
    setRun(false);
    const spent = full ? mins : Math.floor((mins * 60 - left) / 60);
    if (spent > 0) {
      await api("/sessions", {
        method: "POST",
        body: { task_id: task || null, minutes: spent, day: iso(new Date()) },
      });
      onDone();
    }
    if (full) {
      onCelebrate();
      say("session done. tiny celebration happening in my head.");
    }
    setCheer(
      full
        ? "that was a whole session. look at you."
        : "stopped early. still counts.",
    );
    setLeft(mins * 60);
  };
  const fmt = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const C = 2 * Math.PI * 88;
  return (
    <Card title="Focus Timer" icon={Timer} className="mint">
      <p className="muted sm">
        {run ? "locked in. i am right here. headphones on." : cheer}
      </p>
      <div className="ringwrap">
        <svg width="210" height="210" viewBox="0 0 210 210">
          <circle
            cx="105"
            cy="105"
            r="88"
            fill="#fff"
            stroke="#d6eddc"
            strokeWidth="12"
          />
          <circle
            cx="105"
            cy="105"
            r="88"
            fill="none"
            stroke="#8b78e6"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - left / (mins * 60))}
            transform="rotate(-90 105 105)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="ringin">
          <span>{fmt(left)}</span>
          <motion.div
            animate={run ? { y: [0, -3, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Mascot size={54} mood={run ? "focus" : "sleepy"} />
          </motion.div>
        </div>
      </div>
      <div className="row center">
        <button className="play" onClick={() => setRun(!run)}>
          {run ? <Pause size={20} /> : <Play size={20} />}
        </button>
        {run && (
          <button className="play stop" onClick={() => finish(false)}>
            <Square size={14} />
          </button>
        )}
      </div>
      <Select
        value={task}
        onChange={setTask}
        placeholder="any subject"
        options={[
          ["", "any subject"],
          ...tasks.filter((t) => !t.done).map((t) => [String(t.id), t.title]),
        ]}
      />
      <div className="row wrap center">
        {[15, 30, 45, 60].map((m) => (
          <button
            key={m}
            onClick={() => pick(m)}
            className={"chip" + (m === mins ? " on" : "")}
          >
            {m === 60 ? "1h" : m + "m"}
          </button>
        ))}
        <input
          type="number"
          min="1"
          max="180"
          placeholder="custom"
          className="mini-in"
          onBlur={(e) => e.target.value && pick(+e.target.value)}
        />
      </div>
    </Card>
  );
}

/* ---------- calendar + coming up ---------- */
function Cal({ tasks, items, reload }) {
  const [m, setM] = useState(new Date());
  const [sel, setSel] = useState(iso(new Date()));
  const [mode, setMode] = useState("month");
  const [nt, setNt] = useState("");
  const y = m.getFullYear(),
    mo = m.getMonth();
  const first = (new Date(y, mo, 1).getDay() + 6) % 7,
    n = new Date(y, mo + 1, 0).getDate();
  const cells = [
    ...Array(first).fill(null),
    ...Array.from({ length: n }, (_, i) => i + 1),
  ];
  const key = (d) => `${y}-${pad(mo + 1)}-${pad(d)}`;
  const today = iso(new Date());
  const all = [
    ...tasks.filter((t) => !t.done && t.due).map((t) => ({ ...t, k: "task" })),
    ...items
      .filter((i) => i.due && i.kind !== "note" && i.kind !== "goal")
      .map((i) => ({ ...i, k: i.kind })),
  ];
  const on = all.filter((x) => x.due === sel);
  const soon = all
    .filter((x) => x.due >= today)
    .sort((a, b) => (a.due < b.due ? -1 : 1))
    .slice(0, 5);
  const step = (k) => {
    if (mode === "day") {
      const d = new Date(sel + "T00:00");
      d.setDate(d.getDate() + k);
      setSel(iso(d));
      setM(d);
    } else setM(new Date(y, mo + k, 1));
  };
  const addT = async (e) => {
    e.preventDefault();
    if (!nt.trim()) return;
    await api("/tasks", { method: "POST", body: { title: nt, due: sel } });
    setNt("");
    reload();
  };
  return (
    <Card
      title="Calendar"
      icon={CalendarDays}
      className="warm"
      right={
        <span className="row">
          <button
            className={"chip" + (mode === "month" ? " on" : "")}
            onClick={() => setMode("month")}
          >
            Month
          </button>
          <button
            className={"chip" + (mode === "day" ? " on" : "")}
            onClick={() => setMode("day")}
          >
            Day
          </button>
          <button className="ic" onClick={() => step(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="ic" onClick={() => step(1)}>
            <ChevronRight size={16} />
          </button>
        </span>
      }
    >
      <div className="calbody">
        <div className="calmain">
          <div className="mname">
            {mode === "month"
              ? m.toLocaleDateString("en", { month: "long", year: "numeric" })
              : new Date(sel + "T00:00").toLocaleDateString("en", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
          </div>
          {mode === "month" && (
            <div className="cal">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <small key={d}>{d}</small>
              ))}
              {cells.map((d, i) =>
                d ? (
                  <button
                    key={i}
                    onClick={() => setSel(key(d))}
                    className={
                      "day" +
                      (sel === key(d) ? " sel" : "") +
                      (today === key(d) ? " today" : "")
                    }
                  >
                    {d}
                    <span className="dots">
                      {[
                        ...new Set(
                          all.filter((x) => x.due === key(d)).map((x) => x.k),
                        ),
                      ]
                        .slice(0, 3)
                        .map((k) => (
                          <i key={k} style={{ background: KCOL[k] }} />
                        ))}
                    </span>
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          )}
          <div className="dayList">
            {on.length === 0 && (
              <div className="muted sm">
                nothing on {sel === today ? "today" : "this day"}. suspiciously
                free.
              </div>
            )}
            {on.map((t) => (
              <div key={t.k + t.id} className="sub">
                <span className="tag" style={{ background: KCOL[t.k] }}>
                  {t.k}
                </span>
                {t.title}
              </div>
            ))}
          </div>
          <form onSubmit={addT} className="add">
            <input
              value={nt}
              onChange={(e) => setNt(e.target.value)}
              placeholder="plan something for this day..."
            />
            <button className="btn soft">
              <Plus size={14} />
            </button>
          </form>
        </div>
        <div className="coming">
          <h4>coming up</h4>
          {soon.length === 0 && (
            <p className="muted sm">no deadlines ahead. enjoy the quiet.</p>
          )}
          {soon.map((x) => (
            <div key={x.k + x.id} className="cu">
              <i style={{ background: KCOL[x.k] }} />
              <div>
                <b>{x.title}</b>
                <small className="num muted">
                  {x.k} · {left(x.due)}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------- projects / exams / assignments / goals / notes ---------- */
function Items({ kind, items, reload, big }) {
  const { t: name, I, due: hasDue, prog: hasProg, empty, ph } = CFG[kind];
  const [t, setT] = useState("");
  const [d, setD] = useState("");
  const list = items.filter((i) => i.kind === kind);
  const patch = async (id, b) => {
    await api("/items/" + id, { method: "PATCH", body: b });
    reload();
  };
  const add = async (e) => {
    e.preventDefault();
    if (!t.trim()) return;
    await api("/items", {
      method: "POST",
      body: { kind, title: t, due: d || null },
    });
    setT("");
    setD("");
    reload();
  };
  return (
    <Card title={name} icon={I} className={big ? "hero" : "flat"}>
      {list.length === 0 && <p className="empty">{empty}</p>}
      {list.map((i) => (
        <div key={i.id} className="item">
          <div className="row between">
            <input
              className="bare"
              defaultValue={i.title}
              onBlur={(e) =>
                e.target.value &&
                e.target.value !== i.title &&
                patch(i.id, { title: e.target.value })
              }
            />
            <button
              className="ic trash"
              onClick={async () => {
                await api("/items/" + i.id, { method: "DELETE" });
                reload();
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
          {kind === "note" && (
            <textarea
              defaultValue={i.body}
              placeholder="write more..."
              onBlur={(e) => patch(i.id, { body: e.target.value })}
            />
          )}
          {hasDue ? (
            <div className="row">
              <DatePicker
                value={i.due || ""}
                onChange={(v) => patch(i.id, { due: v || null })}
              />
              {i.due && <small className="num muted">{left(i.due)}</small>}
            </div>
          ) : null}
          {hasProg ? (
            <div className="row">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={i.progress}
                onChange={(e) => patch(i.id, { progress: +e.target.value })}
              />
              <span className="num muted">{i.progress}%</span>
            </div>
          ) : null}
        </div>
      ))}
      <form onSubmit={add} className="add">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder={ph}
        />
        {hasDue ? (
          <DatePicker
            value={d}
            onChange={setD}
            placeholder="due"
            align="right"
          />
        ) : null}
        <button className="btn soft">
          <Plus size={16} />
        </button>
      </form>
    </Card>
  );
}

/* ---------- weekly + activity ---------- */
function Weekly({ stats, doneCount, go }) {
  const days = stats.days || [],
    cats = stats.cats || [];
  const total = days.reduce((a, s) => a + s.total, 0);
  return (
    <Card title="Your week" icon={BarChart3} className="flat">
      {total === 0 ? (
        <div className="emptyweek">
          <Bunny size={70} />
          <div>
            <p>
              floof has not seen you focus this week. no pressure. maybe 25
              minutes?
            </p>
            <button className="btn soft" onClick={() => go("Today")}>
              Start a session
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="muted sm">
            {Math.round(total / 6) / 10}h of focus and {doneCount} tasks
            finished. floof is quietly impressed.
          </p>
          <div style={{ height: 150 }}>
            <ResponsiveContainer>
              <BarChart data={days}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <Tooltip cursor={false} />
                {cats.map((c, i) => (
                  <Bar
                    key={c}
                    dataKey={c}
                    stackId="a"
                    fill={COLORS[i % 7]}
                    radius={i === cats.length - 1 ? [8, 8, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {cats.map((c, i) => (
              <span key={c}>
                <i style={{ background: COLORS[i % 7] }} />
                {c}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
function Activity({ list }) {
  return (
    <Card title="Little receipts" icon={Sparkles} className="flat">
      {list.length === 0 && (
        <p className="empty">
          nothing yet. do something, I will keep the receipt.
        </p>
      )}
      {list.map((a) => (
        <div key={a.id} className="item arow">
          <span>{a.text}</span>
          <small className="num muted">
            {new Date(a.at + "Z").toLocaleString("en", {
              hour: "numeric",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
          </small>
        </div>
      ))}
    </Card>
  );
}

/* ---------- quick actions ---------- */
const QA = {
  task: ["New task", "what are we bullying today?"],
  note: ["New note", "jot it down before it escapes."],
  exam: ["Add exam", "name the beast."],
  assignment: ["Add assignment", "what is due? be brave."],
  project: ["New project", "something big. we will slice it up."],
};
function QuickModal({ kind, onClose, reload, say, projects }) {
  const [t, setT] = useState("");
  const [d, setD] = useState("");
  const [body, setBody] = useState("");
  const [cat, setCat] = useState("study");
  const [pri, setPri] = useState("medium");
  if (!kind) return <Modal open={false} />;
  const submit = async (e) => {
    e.preventDefault();
    if (!t.trim()) return;
    if (kind === "task")
      await api("/tasks", {
        method: "POST",
        body: {
          title: t,
          due: d || iso(new Date()),
          category: cat,
          priority: pri,
        },
      });
    else
      await api("/items", {
        method: "POST",
        body: { kind, title: t, due: d || null, body },
      });
    setT("");
    setD("");
    setBody("");
    onClose();
    reload();
    say("added. floof approves.");
  };
  return (
    <Modal open onClose={onClose}>
      <form onSubmit={submit} className="qm">
        <h3>{QA[kind][0]}</h3>
        <p className="muted">{QA[kind][1]}</p>
        <input
          autoFocus
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="title"
        />
        {kind === "note" && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="the rest of the thought..."
          />
        )}
        {kind !== "note" && (
          <DatePicker
            value={d}
            onChange={setD}
            placeholder={
              kind === "task" ? "due (defaults to today)" : "due date"
            }
          />
        )}
        {kind === "task" && (
          <div className="row">
            <Select
              value={cat}
              options={["study", "work", "personal", ...projects].map((c) => [
                c,
                c,
              ])}
              onChange={setCat}
            />
            <Select value={pri} options={PRIS} onChange={setPri} />
          </div>
        )}
        <div className="row">
          <button type="button" className="btn soft" onClick={onClose}>
            never mind
          </button>
          <button className="btn">Add it</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- app ---------- */
function Main({ user, logout }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [items, setItems] = useState([]);
  const [activity, setActivity] = useState([]);
  const [page, setPage] = useState("Home");
  const [bell, setBell] = useState(false);
  const [q, setQ] = useState("");
  const [qa, setQa] = useState(null);
  const [toast, setToast] = useState("");
  const [running, setRunning] = useState(false);
  const [party, setParty] = useState(false);
  const [perm, setPerm] = useState(
    "Notification" in window ? Notification.permission : "denied",
  );
  const load = () => {
    api("/tasks").then(setTasks);
    api("/stats").then(setStats);
    api("/items").then(setItems);
    api("/activity").then(setActivity);
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 300000);
    return () => clearInterval(id);
  }, []);
  const say = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };
  const celebrate = () => {
    setParty(true);
    setTimeout(() => setParty(false), 2500);
  };
  const today = iso(new Date());
  const soon = iso(new Date(Date.now() + 3 * 864e5));
  const notes = [
    ...tasks
      .filter((t) => !t.done && t.due && t.due <= today)
      .map((t) => `"${t.title}" wants attention today.`),
    ...items
      .filter(
        (i) =>
          (i.kind === "exam" || i.kind === "assignment") &&
          i.due &&
          i.due <= soon &&
          i.progress < 100,
      )
      .map((i) => `${i.title}: ${left(i.due)}. just saying.`),
  ];
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    const seen = JSON.parse(localStorage.getItem("floofSeen") || "{}");
    notes.forEach((n) => {
      if (!seen[n + today]) {
        new Notification("Floof", { body: n });
        seen[n + today] = 1;
      }
    });
    localStorage.setItem("floofSeen", JSON.stringify(seen));
  }, [notes.join("|")]);
  const projects = items
    .filter((i) => i.kind === "project")
    .map((i) => i.title);
  const open = tasks.filter((t) => !t.done).length;
  const hr = new Date().getHours();
  const mood = party
    ? "party"
    : running
      ? "focus"
      : open > 6
        ? "worried"
        : open === 0 || hr >= 23 || hr < 5
          ? "sleepy"
          : "happy";
  const sub =
    {
      party: "yesss. tiny victory.",
      focus: "headphones on. i am right here.",
      worried: "i am not judging. i am a little scared.",
      sleepy: "zzz... nothing is on fire. enjoy it.",
    }[mood] ||
    `you have ${open} thing${open === 1 ? "" : "s"} that actually matter today. the rest can wait.`;
  const res = q.trim()
    ? [
        ...tasks.map((t) => ({ ...t, k: "task" })),
        ...items.map((i) => ({ ...i, k: i.kind })),
      ]
        .filter((x) => x.title.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
    : [];
  const jump = (k) => {
    setPage(k === "task" ? "Today" : CFG[k].t);
    setQ("");
  };
  const common = { tasks, items, reload: load };
  const T = (
    <Tasks
      tasks={tasks}
      reload={load}
      projects={projects}
      onCelebrate={celebrate}
    />
  );
  const F = (
    <Focus
      tasks={tasks}
      onDone={load}
      onRun={setRunning}
      onCelebrate={celebrate}
      say={say}
    />
  );
  const one = (k) => (
    <div className="solo">
      <Items kind={k} items={items} reload={load} big />
    </div>
  );
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <Mascot size={44} mood={mood} />
          <div>
            <h1>Floof</h1>
            <small>
              small steps,
              <br />
              big dreams
            </small>
          </div>
        </div>
        {NAV.map(([g, list]) => (
          <div key={g} className="navgroup">
            <small>{g}</small>
            {list.map(([n, I]) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={"nav" + (page === n ? " on" : "")}
              >
                <I size={18} /> <span>{n}</span>
              </button>
            ))}
          </div>
        ))}
        <div className="sleepy">
          <Bunny size={100} />
          <small>you got this</small>
        </div>
      </aside>
      <main>
        <Sparkle
          c="#f7b6c2"
          s={18}
          style={{ position: "absolute", top: 60, left: "45%" }}
        />
        <Sparkle
          c="#cdb8f0"
          s={14}
          style={{ position: "absolute", top: 30, right: "30%" }}
        />
        <div className="top">
          <div className="hello">
            <Desk mood={mood} />
            <div>
              <h2>
                {hr < 12
                  ? "good morning"
                  : hr < 18
                    ? "good afternoon"
                    : "good evening"}
                , {user.name.split(" ")[0]}!
              </h2>
              <p>{sub}</p>
            </div>
          </div>
          <div className="tools">
            <div className="searchwrap">
              <div className="search">
                <Search size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search anything..."
                />
              </div>
              {res.length > 0 && (
                <div className="panel">
                  {res.map((x) => (
                    <button key={x.k + x.id} onClick={() => jump(x.k)}>
                      <i style={{ background: KCOL[x.k] }} />
                      {x.title}
                      <small className="muted">{x.k}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="bellwrap">
              <button className="ic big" onClick={() => setBell(!bell)}>
                <Bell size={18} />
                {notes.length > 0 && <i className="badge" />}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div
                    className="panel notes"
                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {notes.length ? (
                      notes.map((n) => <p key={n}>{n}</p>)
                    ) : (
                      <p>nothing urgent. floof is also relaxing.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        {page === "Home" && (
          <div className="qbar">
            <button className="btn" onClick={() => setQa("task")}>
              <Plus size={16} /> New Task
            </button>
            {["note", "exam", "assignment", "project"].map((k) => (
              <button key={k} className="btn soft sm" onClick={() => setQa(k)}>
                {QA[k][0]}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {page === "Home" && (
              <div className="grid">
                <div className="c7">{T}</div>
                <div className="c5">
                  <AskFloof reload={load} say={say} />
                </div>
                <div className="c4">{F}</div>
                <div className="c8">
                  <Cal {...common} />
                </div>
                <div className="mini c12">
                  {["project", "exam", "assignment", "goal"].map((k) => (
                    <Items key={k} kind={k} items={items} reload={load} />
                  ))}
                </div>
                <div className="c7">
                  <Weekly
                    stats={stats}
                    doneCount={tasks.filter((t) => t.done).length}
                    go={setPage}
                  />
                </div>
                <div className="c5">
                  <Activity list={activity} />
                </div>
              </div>
            )}
            {page === "Today" && (
              <div className="grid">
                <div className="c7">{T}</div>
                <div className="c5">{F}</div>
              </div>
            )}
            {page === "Calendar" && <Cal {...common} />}
            {["Projects", "Exams", "Assignments", "Goals", "Notes"].includes(
              page,
            ) &&
              one(
                {
                  Projects: "project",
                  Exams: "exam",
                  Assignments: "assignment",
                  Goals: "goal",
                  Notes: "note",
                }[page],
              )}
            {page === "Ask Floof" && (
              <div className="solo wide">
                <AskFloof reload={load} say={say} tall />
              </div>
            )}
            {page === "Settings" && (
              <div className="solo">
                <Card title="Settings" icon={Settings} className="hero">
                  <p>
                    <b>{user.name}</b>{" "}
                    <span className="muted">· {user.email}</span>
                  </p>
                  <p className="muted sm">
                    deadline reminders work while Floof is open in a browser
                    tab.
                  </p>
                  <button
                    className="btn soft"
                    onClick={() =>
                      "Notification" in window &&
                      Notification.requestPermission().then(setPerm)
                    }
                  >
                    {perm === "granted"
                      ? "Reminders are on"
                      : "Turn on reminders"}
                  </button>
                  <button className="btn soft" onClick={logout}>
                    <LogOut size={14} /> Log out
                  </button>
                  <p className="muted sm">
                    Floof runs on Gemma behind the scenes.
                  </p>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <QuickModal
        kind={qa}
        onClose={() => setQa(null)}
        reload={load}
        say={say}
        projects={projects}
      />
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("floof-logout", out);
    if (tok())
      api("/me")
        .then(setUser)
        .catch(() => {})
        .finally(() => setReady(true));
    else setReady(true);
    return () => window.removeEventListener("floof-logout", out);
  }, []);
  if (!ready) return null;
  return user ? (
    <Main
      user={user}
      logout={() => {
        localStorage.removeItem("floofToken");
        setUser(null);
      }}
    />
  ) : (
    <Auth onAuth={setUser} />
  );
}
