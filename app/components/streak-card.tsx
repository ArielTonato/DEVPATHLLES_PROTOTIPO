import Image from "next/image";
import { shiftDateKey, type StreakState } from "@/lib/streak";

interface StreakCardProps {
  state: StreakState;
  dateKey: string;
  actualDateKey: string;
  onAdvanceDay: () => void;
  onSkipDay: () => void;
  onUseActualDate: () => void;
  onReset: () => void;
}

const weekdayFormatter = new Intl.DateTimeFormat("es-EC", { weekday: "narrow", timeZone: "UTC" });

function weekdayLabel(dateKey: string): string {
  return weekdayFormatter.format(new Date(`${dateKey}T12:00:00Z`)).toUpperCase();
}

export function StreakCard({ state, dateKey, actualDateKey, onAdvanceDay, onSkipDay, onUseActualDate, onReset }: StreakCardProps) {
  if (!dateKey) return null;

  const activityDates = new Set(state.activityDates);
  const activeToday = activityDates.has(dateKey);
  const week = Array.from({ length: 7 }, (_, index) => shiftDateKey(dateKey, index - 6));

  return <section className={`streak-card ${activeToday ? "active" : "pending"}`} aria-label="Racha de aprendizaje">
    <div className="streak-heading">
      <div><span className="eyebrow">RACHA DE APRENDIZAJE</span><div className="streak-count"><span aria-hidden="true">◆</span><strong>{state.currentDays}</strong><small>{state.currentDays === 1 ? "día" : "días"}</small></div></div>
      {!activeToday && <Image className="streak-reminder" src="/streak/reminder.png" alt="Astronauta protegiendo la llama de tu racha" width={108} height={108} />}
    </div>
    <p>{activeToday ? "Racha activada por hoy. Sigue avanzando a tu ritmo." : "Aprueba un cuestionario hoy para mantener viva tu racha."}</p>
    <div className="streak-week" aria-label="Actividad de los últimos siete días">{week.map((day) => <div className={activityDates.has(day) ? "complete" : day === dateKey ? "today" : ""} key={day}><span>{weekdayLabel(day)}</span><i aria-label={activityDates.has(day) ? "Día completado" : "Día pendiente"}>{activityDates.has(day) ? "✓" : ""}</i></div>)}</div>
    <div className="streak-best"><span>Mejor racha</span><strong>{state.bestDays} días</strong></div>
    <details className="streak-demo"><summary>Controles de demostración</summary><p>Fecha simulada: <strong>{dateKey}</strong></p><div><button type="button" onClick={onAdvanceDay}>+1 día</button><button type="button" onClick={onSkipDay}>Saltar un día</button>{dateKey !== actualDateKey && <button type="button" onClick={onUseActualDate}>Fecha real</button>}<button type="button" onClick={onReset}>Reiniciar racha</button></div></details>
  </section>;
}
