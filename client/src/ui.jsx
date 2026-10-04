import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Check } from 'lucide-react';

function useOut(cb) {
  const r = useRef();
  useEffect(() => { const f = e => { if (r.current && !r.current.contains(e.target)) cb(); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  return r;
}
const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function Select({ value, onChange, options, placeholder = 'choose', className = '' }) {
  const [o, setO] = useState(false);
  const ref = useOut(() => setO(false));
  const cur = options.find(x => x[0] === value);
  return (
    <div className={'dd ' + className} ref={ref}>
      <button type="button" className="dd-btn" onClick={() => setO(!o)}><span>{cur ? cur[1] : placeholder}</span><ChevronDown size={14} /></button>
      <AnimatePresence>
        {o && <motion.ul className="dd-list" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {options.map(([v, l]) => <li key={v}><button type="button" className={v === value ? 'on' : ''} onClick={() => { onChange(v); setO(false); }}>{l}{v === value && <Check size={13} />}</button></li>)}
        </motion.ul>}
      </AnimatePresence>
    </div>
  );
}

export function DatePicker({ value, onChange, placeholder = 'pick a date', align = 'left' }) {
  const [o, setO] = useState(false);
  const ref = useOut(() => setO(false));
  const base = value ? new Date(value + 'T00:00') : new Date();
  const [v, setV] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const y = v.getFullYear(), m = v.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  const t = new Date(), today = ymd(t.getFullYear(), t.getMonth(), t.getDate());
  const label = value ? new Date(value + 'T00:00').toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder;
  const pick = d => { onChange(d); setO(false); };
  return (
    <div className="dd dp" ref={ref}>
      <button type="button" className={'dd-btn' + (value ? '' : ' ph')} onClick={() => setO(!o)}><CalendarDays size={14} /><span>{label}</span></button>
      <AnimatePresence>
        {o && <motion.div className={'dp-pop ' + align} initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="dp-head"><button type="button" className="ic" onClick={() => setV(new Date(y, m - 1, 1))}><ChevronLeft size={16} /></button><b>{v.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</b><button type="button" className="ic" onClick={() => setV(new Date(y, m + 1, 1))}><ChevronRight size={16} /></button></div>
          <div className="dp-grid">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <small key={i}>{d}</small>)}
            {cells.map((d, i) => d ? <button type="button" key={i} className={'dp-day' + (ymd(y, m, d) === value ? ' sel' : '') + (ymd(y, m, d) === today ? ' today' : '')} onClick={() => pick(ymd(y, m, d))}>{d}</button> : <span key={i} />)}
          </div>
          <div className="dp-foot"><button type="button" onClick={() => pick('')}>clear</button><button type="button" onClick={() => pick(today)}>today</button></div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

export function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <motion.div className="modal" initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}>{children}</motion.div>
      </motion.div>}
    </AnimatePresence>
  );
}
