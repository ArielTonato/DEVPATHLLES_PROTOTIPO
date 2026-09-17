"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { goalLabels, levelLabels, type LearningPath, type PathCourse } from "@/lib/path-types";

export function Roadmap({ path, onNewPath }: { path: LearningPath; onNewPath: () => void }) {
  const core = path.courses.filter((course) => course.priority !== "opcional");
  const bonuses = path.courses.filter((course) => course.priority === "opcional");
  const [selected, setSelected] = useState<PathCourse>(core[0]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [chapter, setChapter] = useState<string | null>(null);
  const nextIndex = core.findIndex((course) => !completed.includes(course.slug));
  const isBonus = selected.priority === "opcional";
  const canSimulate = isBonus || core[nextIndex]?.slug === selected.slug;
  const progress = Math.round((core.filter((course) => completed.includes(course.slug)).length / core.length) * 100);
  const hours = Math.round(core.reduce((total, course) => total + course.hours, 0));

  function selectCourse(course: PathCourse, chapterTitle: string | null): void {
    setSelected(course);
    setChapter(chapterTitle);
  }

  return <main className="roadmap-page">
    <div className="route-heading"><div><span className="eyebrow">TU MISIÓN · {path.answers.route}</span><h1>{path.title}</h1><p>{path.description}</p></div><button className="secondary-button" onClick={onNewPath}>+ Nueva ruta</button></div>
    <div className="route-layout">
      <aside className="route-summary"><div className="panel"><span className="eyebrow">TU PUNTO DE PARTIDA</span><h3>{levelLabels[path.answers.userLevel]}</h3><p>{goalLabels[path.answers.goal]}</p><div className="route-stats"><div><strong>{core.length}</strong><span>cursos en tu ruta</span></div><div><strong>{hours} h</strong><span>de contenido</span></div></div><div className="progress-label"><span>Avance de demostración</span><strong>{progress}%</strong></div><progress value={progress} max={100} /><small className="muted">Prueba los estados de los nodos. Este avance es temporal y no acredita cursos.</small></div><div className="mentor-card"><Image src="/astronauta.png" alt="Tu compañero de aprendizaje" width={94} height={94} /><h3>Un paso a la vez.</h3><p>{path.advice}</p></div></aside>
      <section className="path-map" aria-label="Ruta de aprendizaje"><div className="map-title"><span className="signal-dot" /><span>{nextIndex === -1 ? "¡Llegaste a tu destino!" : "Tu aventura empieza aquí"}</span></div><div className="path-line" aria-hidden="true" />{core.map((course, index) => {
        const done = completed.includes(course.slug);
        const available = index === nextIndex;
        const offset = [0, -65, 0, 65][index % 4];
        return <div className={`course-stop ${done ? "done" : available ? "available" : "locked"}`} key={course.slug} style={{ "--offset": `${offset}px` } as CSSProperties}><span className="stage-label">ETAPA {course.stage}</span><button className={`course-node ${selected.slug === course.slug && !chapter ? "node-selected" : ""}`} onClick={() => selectCourse(course, null)} aria-label={`${course.title}: ${done ? "completado en demo" : available ? "disponible" : "bloqueado, ver detalle"}`} aria-pressed={selected.slug === course.slug && !chapter}>{done ? "✓" : available ? "▶" : <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>}</button><h3>{course.title}</h3><span className="course-caption">{course.hours} h · {course.priority === "requerido" ? "Esencial" : "Recomendado"}</span>{course.chapters.length > 0 && <div className="chapter-nodes" aria-label={`Capítulos de ${course.title}`}>{course.chapters.slice(0, 3).map((title, chapterIndex) => <button className={chapter === title && selected.slug === course.slug ? "chapter-node chosen" : "chapter-node"} onClick={() => selectCourse(course, title)} key={`${title}-${chapterIndex}`} aria-label={`Ver capítulo: ${title}`}>{chapterIndex + 1}</button>)}{course.chapters.length > 3 && <button className="more-chapters" onClick={() => selectCourse(course, null)} aria-label={`Ver los ${course.chapters.length} capítulos`}>+{course.chapters.length - 3}</button>}</div>}</div>;
      })}<div className="finish-marker"><span>✦</span><strong>Tu próximo gran destino</strong></div></section>
      <aside className="course-sidebar"><section className="panel course-detail" aria-live="polite"><span className="eyebrow">{chapter ? "EXPLORA UN CAPÍTULO" : isBonus ? "MISIÓN BONUS" : "EXPLORA TU CURSO"}</span><h2>{chapter ?? selected.title}</h2><p>{selected.summary}</p><div className="detail-tags"><span>{selected.hours} h de curso</span><span>{selected.chapters.length} capítulos</span></div>{selected.chapters.length > 0 && <details key={selected.slug}><summary>Contenido del curso</summary><ol>{selected.chapters.map((title, index) => <li key={`${title}-${index}`}><button className="chapter-link" onClick={() => setChapter(title)}>{title}</button></li>)}</ol></details>}<a className="primary-button course-link" href={`https://cursos.devtalles.com/courses/${selected.slug}`} target="_blank" rel="noreferrer">Ver curso en DevTalles ↗</a><div className="demo-control"><span className="eyebrow">VISTA PREVIA DEL PROGRESO</span><p>En la versión completa avanzarás al aprobar un cuestionario.</p><button className="secondary-button" disabled={!canSimulate || completed.includes(selected.slug)} onClick={() => setCompleted([...completed, selected.slug])}>{completed.includes(selected.slug) ? "Completado en demo" : canSimulate ? "Simular curso completado" : "Completa el curso anterior"}</button></div></section>{bonuses.length > 0 && <section className="bonus-panel"><h3>Desvíos que suman <span>{bonuses.length}</span></h3><p>Opcionales. No bloquean tu camino.</p>{bonuses.map((course) => <button key={course.slug} className="bonus-course" onClick={() => selectCourse(course, null)}><span>✦</span><span>{course.title}</span><span>↗</span></button>)}</section>}</aside>
    </div>
  </main>;
}
