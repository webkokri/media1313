import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../content.jsx';

function useWeek() {
  return useMemo(() => {
    const start = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        dow: i === 0 ? 'TODAY' : d.toLocaleDateString('en-CA', { weekday: 'short' }).toUpperCase(),
        date: d.getDate(),
        weekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, []);
}

function Lineup({ title, color, liveLabel, tagStyle, linkText, rows, showNow, titleExtra }) {
  return (
    <section data-edit="SCHEDULE" aria-label={`${title} schedule`} style={{ flex: '1 1 480px', minWidth: 0, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: color, color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="cond" style={{ fontWeight: 800, fontSize: 28 }}>{title} {titleExtra}</h2>
        <Link to="/live" style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{linkText}</Link>
      </div>
      {rows.map(([time, name, sub, now]) => {
        const isNow = showNow && now;
        return (
          <div key={time + name} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderTop: '1px solid var(--line)', background: isNow ? 'var(--red-tint)' : undefined }}>
            <span style={{ width: 84, flex: 'none', fontWeight: 600, fontSize: 14 }}>{time}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span className="row-title" style={{ fontWeight: 700, fontSize: 16 }}>{name}</span><span className="row-sub">{sub}</span></span>
            {isNow && <span className="tag" style={tagStyle}>{liveLabel}</span>}
          </div>
        );
      })}
    </section>
  );
}

export default function Schedule() {
  const { FM, SCHEDULE } = useContent();
  const week = useWeek();
  const [day, setDay] = useState(0);
  const weekend = week[day].weekend;

  return (
    <main className="container stack" style={{ paddingTop: 40, paddingBottom: 64, gap: 28 }}>
      <div className="stack" style={{ gap: 10 }}>
        <h1 className="page-title">Schedule</h1>
        <p style={{ fontSize: 17, color: 'var(--body)' }}>What's on 1313 TV and 1313 Radio this week. All times Eastern.</p>
      </div>

      <div role="tablist" aria-label="Day" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {week.map((d, i) => {
          const sel = i === day;
          return (
            <button key={i} type="button" role="tab" aria-selected={sel} onClick={() => setDay(i)}
              style={{ flex: '0 0 auto', minWidth: 84, padding: '10px 14px', borderRadius: 10, border: `2px solid ${sel ? 'var(--ink)' : 'var(--line)'}`, background: sel ? 'var(--ink)' : '#fff', color: sel ? '#fff' : 'var(--ink)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{d.dow}</span>
              <span className="cond" style={{ display: 'block', fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{d.date}</span>
            </button>
          );
        })}
      </div>

      <div className="row" style={{ gap: 28 }}>
        <Lineup title="1313 TV" color="var(--red)" linkText="Watch live" liveLabel="ON NOW" tagStyle={{ background: 'var(--red)', color: '#fff' }}
          rows={weekend ? SCHEDULE.tvWeekend : SCHEDULE.tvWeekday} showNow={day === 0} />
        <Lineup title="1313 Radio" color="var(--ink)" linkText="Listen live" liveLabel="ON AIR" tagStyle={{ background: 'var(--amber)', color: 'var(--ink)' }}
          titleExtra={<span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: 'var(--amber)' }}>{FM}</span>}
          rows={weekend ? SCHEDULE.radioWeekend : SCHEDULE.radioWeekday} showNow={day === 0} />
      </div>
    </main>
  );
}
