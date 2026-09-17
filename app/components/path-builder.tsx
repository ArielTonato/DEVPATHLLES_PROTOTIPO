"use client";

import Image from "next/image";
import { useState } from "react";
import { goalLabels, levelLabels, type Answers, type LearningGoal, type LearningPath, type ProgramOption, type UserLevel } from "@/lib/path-types";
import { Roadmap } from "./roadmap";

const programDescriptions: Record<string, string> = {
  fundamentos: "Tu primera línea de código", react: "Interfaces web y apps móviles", vue: "Interfaces simples, ideas grandes", angular: "Aplicaciones a gran escala", node: "El motor detrás de la web", nest: "Backend con buena arquitectura", dart: "Una idea, muchas pantallas", python: "De scripts a inteligencia artificial", java: "Software sólido y escalable", csharp: "El universo de .NET", ia: "Agentes y automatizaciones", php: "De la web a Laravel", go: "Backend rápido y concurrente",
};
const programSymbols: Record<string, string> = { fundamentos: "</>", react: "Re", vue: "V", angular: "A", node: "N", nest: "Ns", dart: "D", python: "Py", java: "J", csharp: "C#", ia: "AI", php: "php", go: "Go" };
const storageKey = "devpathlles.paths.v1";

export function PathBuilder({ programs }: { programs: ProgramOption[] }) {
  const [step, setStep] = useState<number>(0);
  const [programSlug, setProgramSlug] = useState<string>("");
  const [routeTitle, setRouteTitle] = useState<string>("");
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [alternatives, setAlternatives] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string>("");
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [savedPaths, setSavedPaths] = useState<LearningPath[]>([]);
  const [showSaved, setShowSaved] = useState<boolean>(false);
  const program = programs.find((item) => item.slug === programSlug);
  const selectedRoute = program?.routes.find((item) => item.title === routeTitle);
  const hasAlternatives = Boolean(selectedRoute?.alternatives.length);
  const totalSteps = hasAlternatives ? 4 : 3;
  const headings = ["¿Cuál es tu próximo destino?", "¿Desde dónde despegamos?", "¿Qué quieres conseguir?", "Elige tu copiloto de IA"];
  const subtitles = ["Elige lo que te gustaría aprender. Nosotros trazamos el camino.", "Tu experiencia nos ayuda a encontrar el punto de partida adecuado.", "Un objetivo claro convierte cada pequeño paso en un gran avance.", "Estas herramientas son alternativas: solo necesitas una para esta etapa."];
  const canContinue = step === 0 ? Boolean(program && selectedRoute) : step === 1 ? Boolean(userLevel) : Boolean(goal);

  function readSavedPaths(): LearningPath[] {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((path: unknown) => {
      if (!path || typeof path !== "object") return false;
      const item = path as LearningPath;
      return typeof item.id === "string" && typeof item.title === "string" && typeof item.description === "string" && typeof item.advice === "string" && item.answers && typeof item.answers.route === "string" && Array.isArray(item.courses) && item.courses.every((course) => typeof course.slug === "string" && typeof course.title === "string" && typeof course.summary === "string" && typeof course.hours === "number" && Array.isArray(course.chapters) && course.chapters.every((chapter) => typeof chapter === "string") && ["requerido", "recomendado", "opcional"].includes(course.priority));
    })) throw new Error("No se pueden leer las rutas guardadas en este navegador.");
    return parsed as LearningPath[];
  }

  function openSaved(): void {
    try {
      setSavedPaths(readSavedPaths());
      setShowSaved(true);
      setError("");
    } catch (cause) {
      console.error("No se pudieron abrir las rutas guardadas", cause);
      setError("No se pudieron leer las rutas guardadas. Comprueba que el navegador permita el almacenamiento local.");
    }
  }

  async function generate(): Promise<void> {
    if (!program || !selectedRoute || !userLevel || !goal || status === "loading") return;
    setStatus("loading");
    setError("");
    const answers: Answers = { program: program.slug, route: selectedRoute.title, userLevel, goal, alternatives };
    try {
      const response = await fetch("/api/paths", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers), signal: AbortSignal.timeout(120_000) });
      const result: LearningPath & { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No pudimos crear tu ruta. Vuelve a intentar.");
      setActivePath(result);
      const existing = readSavedPaths();
      const updated = [result, ...existing.filter((path) => path.id !== result.id)].slice(0, 20);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSavedPaths(updated);
    } catch (cause) {
      console.error("No se pudo generar o guardar la ruta", cause);
      setError(cause instanceof Error ? cause.name === "TimeoutError" ? "La generación tardó demasiado. Vuelve a intentar." : cause.message : "No se pudo conectar. Revisa tu conexión y vuelve a intentar.");
    } finally {
      setStatus("idle");
    }
  }

  function newPath(): void {
    setActivePath(null);
    setShowSaved(false);
    setStep(0);
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={newPath} disabled={status === "loading"} aria-label="DevPathlles, crear ruta"><Image src="/favicon.png" width={36} height={36} alt="" priority /><span>Dev<span className="text-accent">Pathlles</span></span></button>
        <nav aria-label="Navegación principal"><button className={!showSaved ? "nav-link active" : "nav-link"} onClick={newPath} disabled={status === "loading"}>Mi aprendizaje</button><button className={showSaved ? "nav-link active" : "nav-link"} onClick={openSaved} disabled={status === "loading"}>Mis rutas</button></nav>
        <span className="prototype-label"><span /> Prototipo</span>
      </header>
      {error && <div className="error-banner" role="alert">{error}<button aria-label="Cerrar aviso" onClick={() => setError("")}>×</button></div>}
      {showSaved ? (
        <main className="saved-page"><span className="eyebrow">TU BITÁCORA</span><h1>Cada destino cuenta.</h1><p className="muted">Tus rutas se guardan en este navegador. Puedes volver a ellas cuando quieras.</p><div className="saved-grid">{savedPaths.map((path) => <button className="saved-card" key={path.id} onClick={() => { setActivePath(path); setShowSaved(false); }}><span className="eyebrow">{path.answers.route}</span><h2>{path.title}</h2><p>{path.courses.length} cursos · {levelLabels[path.answers.userLevel]}</p><span className="text-accent">Explorar ruta →</span></button>)}</div>{savedPaths.length === 0 && <div className="empty-state"><h2>Tu primera aventura empieza aquí.</h2><p>Todavía no tienes rutas guardadas.</p><button className="primary-button" onClick={newPath}>Crear mi primera ruta →</button></div>}</main>
      ) : activePath ? <Roadmap key={activePath.id} path={activePath} onNewPath={newPath} /> : (
        <main className="onboarding">
          <aside className="mission-panel">
            <span className="eyebrow">TU PRÓXIMA GRAN AVENTURA</span>
            <h1>Pequeños pasos.<br /><span>Grandes destinos.</span></h1>
            <p>No necesitas saber todo el camino.<br />Solo dar el primer paso.</p>
            <div className="astronaut-scene"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="star star-one">+</span><span className="star star-two">+</span><Image className="astronaut" src="/astronauta.png" alt="Astronauta de DevPathlles listo para explorar" width={340} height={340} priority /><span className="floating-note"><span className="signal-dot" /> Un camino hecho para ti</span></div>
            <div className="mission-facts"><div><strong>13</strong><span>programas para explorar</span></div><div><strong>Tu ritmo</strong><span>tu punto de partida</span></div></div>
            <p className="catalog-note">Con los cursos reales de DevTalles</p>
          </aside>
          <section className="question-panel" aria-busy={status === "loading"}>
            <div className="step-meta"><span>DISEÑA TU RUTA</span><span>Paso {step + 1} de {totalSteps}</span></div>
            <div className="step-track" aria-label={`Paso ${step + 1} de ${totalSteps}`}>{Array.from({ length: totalSteps }, (_, index) => <span key={index} className={index <= step ? "filled" : ""} />)}</div>
            {status === "loading" ? <div className="loading-state" role="status"><div className="loading-orbit"><span /></div><span className="eyebrow">PREPARANDO EL DESPEGUE</span><h2>Estamos trazando tu ruta.</h2><p>Conectamos tu experiencia y tus objetivos con los cursos de {program?.name}.</p><div className="loading-check">Catálogo de DevTalles · Ruta personalizada</div><small>Puede tardar hasta dos minutos.</small></div> : <>
              <div className="question-heading" key={step}><h2>{headings[step]}</h2><p>{subtitles[step]}</p></div>
              {step === 0 && <><div className="program-grid" role="group" aria-label="Qué quieres aprender">{programs.map((item) => <button key={item.slug} className={`program-card ${programSlug === item.slug ? "selected" : ""} ${item.slug === "fundamentos" ? "foundations" : ""}`} aria-pressed={programSlug === item.slug} onClick={() => { setProgramSlug(item.slug); setRouteTitle(item.routes[0].title); setAlternatives({}); }}><span className={`program-symbol symbol-${item.slug}`}>{programSymbols[item.slug]}</span><span><strong>{item.slug === "fundamentos" ? "Quiero empezar por las bases" : item.name}</strong><small>{programDescriptions[item.slug]}</small></span><span className="selection-indicator" aria-hidden="true">{programSlug === item.slug ? "✓" : ""}</span></button>)}</div>{program && program.routes.length > 1 && <fieldset className="route-options"><legend>¿Qué especialidad prefieres?</legend>{program.routes.map((route) => <button key={route.title} aria-pressed={routeTitle === route.title} className={`chip ${routeTitle === route.title ? "selected" : ""}`} onClick={() => { setRouteTitle(route.title); setAlternatives({}); }}>{route.title}</button>)}</fieldset>}</>}
              {step === 1 && <div className="answer-list">{(Object.keys(levelLabels) as UserLevel[]).map((level, index) => <button key={level} className={`answer-card ${userLevel === level ? "selected" : ""}`} aria-pressed={userLevel === level} onClick={() => setUserLevel(level)}><span className="answer-number">0{index + 1}</span><span><strong>{levelLabels[level]}</strong><small>{["Quiero construir una base sólida, paso a paso.", "He practicado, pero todavía no tengo experiencia real.", "Ya trabajo en esto y quiero profundizar."][index]}</small></span><span className="selection-indicator">{userLevel === level ? "✓" : ""}</span></button>)}</div>}
              {step === 2 && <div className="answer-list">{(Object.keys(goalLabels) as LearningGoal[]).map((item, index) => <button key={item} className={`answer-card ${goal === item ? "selected" : ""}`} aria-pressed={goal === item} onClick={() => setGoal(item)}><span className="answer-number">0{index + 1}</span><span><strong>{goalLabels[item]}</strong><small>{["Prepararme para mi próxima oportunidad profesional.", "Crear soluciones para clientes con confianza.", "Convertir esa idea que tengo en algo real."][index]}</small></span><span className="selection-indicator">{goal === item ? "✓" : ""}</span></button>)}</div>}
              {step === 3 && selectedRoute?.alternatives.map((alternative) => <fieldset className="alternative-group" key={alternative.key}><legend>Etapa {alternative.stage} · Selecciona una herramienta</legend><div className="answer-list">{alternative.courses.map((course) => <button key={course.slug} className={`answer-card ${alternatives[alternative.key] === course.slug ? "selected" : ""}`} aria-pressed={alternatives[alternative.key] === course.slug} onClick={() => setAlternatives({ ...alternatives, [alternative.key]: course.slug })}><strong>{course.title}</strong><span className="selection-indicator">{alternatives[alternative.key] === course.slug ? "✓" : ""}</span></button>)}</div><p className="muted">Sin preferencia: usaremos {alternative.courses[0].title}.</p></fieldset>)}
              <footer className="question-footer"><button className="back-button" disabled={step === 0} onClick={() => setStep(step - 1)}>← Atrás</button><span className="time-note">A tu medida, desde el inicio</span><button className="primary-button" disabled={!canContinue} onClick={() => step === totalSteps - 1 ? void generate() : setStep(step + 1)}>{step === totalSteps - 1 ? "Generar mi ruta" : "Continuar"} <span>→</span></button></footer>
            </>}
          </section>
        </main>
      )}
      <footer className="site-footer"><span>DevPathlles <span className="footer-dot">·</span> Pequeños desarrolladores, grandes destinos.</span><span>Una aventura de aprendizaje, a tu ritmo.</span></footer>
    </div>
  );
}
