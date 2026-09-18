"use client";

import { useEffect, useState } from "react";
import type { Quiz, QuizTarget } from "@/lib/quiz-types";
import type { StreakUpdate } from "@/lib/streak";
import Image from "next/image";

interface QuizDialogProps {
  target: QuizTarget;
  onClose: () => void;
  onPassed: () => StreakUpdate;
}

interface QuizResult {
  correct: number;
  percentage: number;
  passed: boolean;
}

export function QuizDialog({ target, onClose, onPassed }: QuizDialogProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [streakUpdate, setStreakUpdate] = useState<StreakUpdate | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadQuiz(): Promise<void> {
      try {
        const response = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseSlug: target.courseSlug, chapterTitle: target.chapterTitle }),
          signal: controller.signal,
        });
        const data: Quiz & { error?: string } = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No pudimos preparar el cuestionario.");
        setQuiz(data);
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") return;
        console.error("No se pudo cargar el cuestionario", cause);
        setError(cause instanceof Error ? cause.message : "No pudimos preparar el cuestionario. Vuelve a intentar.");
      }
    }
    void loadQuiz();
    return () => controller.abort();
  }, [target.chapterTitle, target.courseSlug]);

  function selectAnswer(optionIndex: number): void {
    if (revealed) return;
    setAnswers((current) => {
      const updated = [...current];
      updated[currentIndex] = optionIndex;
      return updated;
    });
  }

  function finishQuiz(activeQuiz: Quiz): void {
    const correct = activeQuiz.questions.reduce((total, question, index) => total + (answers[index] === question.correctOption ? 1 : 0), 0);
    const percentage = Math.round((correct / activeQuiz.questions.length) * 100);
    const passed = percentage >= activeQuiz.passPercentage;
    setResult({ correct, percentage, passed });
    if (passed) setStreakUpdate(onPassed());
  }

  function continueQuiz(): void {
    if (!quiz) return;
    if (currentIndex === quiz.questions.length - 1) {
      finishQuiz(quiz);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setRevealed(false);
  }

  function retryQuiz(): void {
    setAnswers([]);
    setCurrentIndex(0);
    setRevealed(false);
    setResult(null);
    setStreakUpdate(null);
  }

  const question = quiz?.questions[currentIndex];
  const selectedOption = answers[currentIndex];

  return <div className="quiz-backdrop" role="presentation">
    <section className="quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <header className="quiz-header">
        <div><span className="eyebrow">{target.chapterTitle ? "MISIÓN DE CAPÍTULO" : "MISIÓN DE CURSO"}</span><h2 id="quiz-title">{target.chapterTitle ?? target.courseTitle}</h2></div>
        <button className="quiz-close" onClick={onClose} aria-label="Cerrar cuestionario">×</button>
      </header>

      {error ? <div className="quiz-message"><span className="quiz-result-icon failed">!</span><h3>No pudimos preparar esta misión</h3><p>{error}</p><button className="secondary-button" onClick={onClose}>Volver a la ruta</button></div>
      : !quiz || !question ? <div className="quiz-message" role="status"><div className="loading-orbit"><span /></div><span className="eyebrow">CREANDO TU MISIÓN</span><h3>La IA está preparando las preguntas.</h3><p>Usamos los temas reales del curso para que cada pregunta tenga sentido.</p></div>
      : result ? <div className="quiz-message quiz-result">{result.passed && streakUpdate?.increased && streakUpdate.celebrationIndex !== null ? <Image className="streak-celebration-image" src={`/streak/celebration-${streakUpdate.celebrationIndex + 1}.png`} alt="Astronauta celebrando tu día de racha" width={190} height={190} priority /> : <span className={`quiz-result-icon ${result.passed ? "passed" : "failed"}`}>{result.passed ? "✓" : "↻"}</span>}<span className="eyebrow">RESULTADO DE LA MISIÓN</span><h3>{result.passed ? "¡Misión cumplida!" : "Estás a un intento de lograrlo."}</h3>{result.passed && streakUpdate && <div className={`streak-result ${streakUpdate.increased ? "increased" : "maintained"}`}><span aria-hidden="true">◆</span><strong>{streakUpdate.state.currentDays}</strong><span>{streakUpdate.state.currentDays === 1 ? "día de racha" : "días de racha"}</span><small>{streakUpdate.increased ? streakUpdate.reset ? "Nueva racha iniciada hoy" : "Completaste tu actividad de hoy" : "Tu racha de hoy ya estaba activa"}</small></div>}<strong className="quiz-score">{result.percentage}%</strong><p>Respondiste correctamente {result.correct} de {quiz.questions.length} preguntas. Necesitas {quiz.passPercentage}% para aprobar.</p><div className="quiz-result-actions">{!result.passed && <button className="secondary-button" onClick={retryQuiz}>Intentar de nuevo</button>}<button className="primary-button" onClick={onClose}>Volver a la ruta →</button></div></div>
      : <div className="quiz-body">
        <div className="quiz-progress"><span>Pregunta {currentIndex + 1} de {quiz.questions.length}</span><span>{Math.round(((currentIndex + 1) / quiz.questions.length) * 100)}%</span></div>
        <div className="quiz-progress-track"><span style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }} /></div>
        <h3>{question.prompt}</h3>
        <div className="quiz-options">{question.options.map((option, optionIndex) => {
          const isSelected = selectedOption === optionIndex;
          const isCorrect = revealed && optionIndex === question.correctOption;
          const isWrong = revealed && isSelected && optionIndex !== question.correctOption;
          return <button key={option} className={`quiz-option ${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`} onClick={() => selectAnswer(optionIndex)} disabled={revealed} aria-pressed={isSelected}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{isCorrect && <strong>✓</strong>}{isWrong && <strong>×</strong>}</button>;
        })}</div>
        {revealed && <div className={`quiz-feedback ${selectedOption === question.correctOption ? "correct" : "wrong"}`}><strong>{selectedOption === question.correctOption ? "Respuesta correcta" : "Esta vez no"}</strong><p>{question.explanation}</p></div>}
        <footer className="quiz-footer"><span>{target.chapterTitle ? "3 preguntas · práctica rápida" : "10 preguntas · aprueba con 60%"}</span>{revealed ? <button className="primary-button" onClick={continueQuiz}>{currentIndex === quiz.questions.length - 1 ? "Ver resultado" : "Siguiente pregunta"} →</button> : <button className="primary-button" disabled={selectedOption === undefined} onClick={() => setRevealed(true)}>Comprobar respuesta</button>}</footer>
      </div>}
    </section>
  </div>;
}
