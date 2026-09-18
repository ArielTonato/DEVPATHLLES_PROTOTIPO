import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getCourseForQuiz } from "@/lib/catalog";
import type { Quiz, QuizQuestion } from "@/lib/quiz-types";
import { OPENROUTER_MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 120;

interface QuizRequest {
  courseSlug: string;
  chapterTitle: string | null;
}

function parseQuizRequest(value: unknown): QuizRequest {
  if (!value || typeof value !== "object") throw new Error("Selecciona un curso o capítulo válido.");
  const input = value as Record<string, unknown>;
  if (typeof input.courseSlug !== "string" || !input.courseSlug.trim() || input.courseSlug.length > 160) throw new Error("El curso seleccionado no es válido.");
  if (input.chapterTitle !== null && input.chapterTitle !== undefined && (typeof input.chapterTitle !== "string" || !input.chapterTitle.trim() || input.chapterTitle.length > 300)) throw new Error("El capítulo seleccionado no es válido.");
  const course = getCourseForQuiz(input.courseSlug);
  const chapterTitle = typeof input.chapterTitle === "string" ? course.chapters.find((chapter) => chapter === input.chapterTitle) : null;
  if (typeof input.chapterTitle === "string" && !chapterTitle) throw new Error("El capítulo no pertenece al curso seleccionado.");
  return { courseSlug: course.slug.toLowerCase(), chapterTitle: chapterTitle ?? null };
}

function parseModelQuiz(content: string, expectedCount: number): QuizQuestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    console.error("La respuesta del modelo no contiene JSON válido", { excerpt: content.slice(0, 500) });
    throw new Error("La IA devolvió un cuestionario con formato inválido. Vuelve a intentar.");
  }
  const questions = (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(questions) || questions.length !== expectedCount) throw new Error(`La IA debe generar exactamente ${expectedCount} preguntas.`);
  return questions.map((question, index) => {
    if (!question || typeof question !== "object") throw new Error(`La pregunta ${index + 1} no es válida.`);
    const item = question as Record<string, unknown>;
    if (typeof item.prompt !== "string" || !item.prompt.trim() || item.prompt.length > 500) throw new Error(`El enunciado de la pregunta ${index + 1} no es válido.`);
    if (!Array.isArray(item.options) || item.options.length !== 4 || !item.options.every((option) => typeof option === "string" && option.trim() && option.length <= 240) || new Set(item.options).size !== 4) throw new Error(`Las opciones de la pregunta ${index + 1} no son válidas.`);
    if (!Number.isInteger(item.correctOption) || (item.correctOption as number) < 0 || (item.correctOption as number) > 3) throw new Error(`La respuesta de la pregunta ${index + 1} no es válida.`);
    if (typeof item.explanation !== "string" || !item.explanation.trim() || item.explanation.length > 500) throw new Error(`La explicación de la pregunta ${index + 1} no es válida.`);
    return { id: String(index + 1), prompt: item.prompt.trim(), options: item.options as [string, string, string, string], correctOption: item.correctOption as number, explanation: item.explanation.trim() };
  });
}

async function generateQuiz(courseSlug: string, chapterTitle: string | null): Promise<Quiz> {
  const key = process.env.NEXT_OPEN_ROUTER_API_KEY;
  if (!key) throw new Error("Falta NEXT_OPEN_ROUTER_API_KEY en .env. Configúrala y reinicia el servidor.");
  const course = getCourseForQuiz(courseSlug);
  const questionCount = chapterTitle ? 3 : 10;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "DevPathlles" },
    signal: AbortSignal.timeout(110_000),
    body: JSON.stringify({
      models: OPENROUTER_MODELS,
      max_tokens: 5000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Generas evaluaciones educativas en español usando únicamente el contenido proporcionado. Responde solo JSON válido, sin markdown: {"questions":[{"prompt":string,"options":[string,string,string,string],"correctOption":number,"explanation":string}]}. Genera exactamente ${questionCount} preguntas, cada una con cuatro opciones distintas y una sola respuesta correcta. correctOption es un índice entre 0 y 3. Alterna la posición de las respuestas correctas. Las opciones incorrectas deben ser plausibles. Evita preguntas ambiguas, triviales o dependientes de datos no incluidos. La explicación debe justificar brevemente la respuesta correcta sin mencionar el índice.` },
        { role: "user", content: JSON.stringify({ tipo: chapterTitle ? "capítulo" : "curso", curso: course.title, capitulo: chapterTitle, resumen: course.summary, temas: course.topics, requisitos: course.prerequisites, resultados: course.outcomes, capitulos: chapterTitle ? [chapterTitle] : course.chapters }) },
      ],
    }),
  });
  if (!response.ok) {
    console.error("OpenRouter rechazó la generación del cuestionario", { status: response.status, courseSlug });
    throw new Error(response.status === 429 ? "El modelo está ocupado. Espera un momento y vuelve a intentar." : `OpenRouter no pudo generar el cuestionario (HTTP ${response.status}).`);
  }
  const completion: unknown = await response.json();
  const content = (completion as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("El modelo devolvió un cuestionario vacío. Vuelve a intentar.");
  return {
    nodeKey: createHash("sha256").update(`${course.slug.toLowerCase()}:${chapterTitle ?? "course"}`).digest("hex").slice(0, 16),
    title: chapterTitle ?? course.title,
    kind: chapterTitle ? "chapter" : "course",
    passPercentage: 60,
    questions: parseModelQuiz(content, questionCount),
  };
}

const getCachedQuiz = unstable_cache(generateQuiz, ["devpathlles-quizzes-v1", OPENROUTER_MODELS.join(",")], { revalidate: 604800 });

export async function POST(request: Request): Promise<Response> {
  let input: QuizRequest;
  try {
    input = parseQuizRequest(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "El nodo seleccionado no es válido." }, { status: 400 });
  }
  try {
    return Response.json(await getCachedQuiz(input.courseSlug, input.chapterTitle));
  } catch (error) {
    console.error("No se pudo generar el cuestionario", { ...input, error: error instanceof Error ? error.message : "Error desconocido" });
    return Response.json({ error: error instanceof Error && error.name !== "TimeoutError" ? error.message : "La generación tardó demasiado. Vuelve a intentar." }, { status: 502 });
  }
}
