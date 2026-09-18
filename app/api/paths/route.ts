import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getPathCourses, parseAnswers } from "@/lib/catalog";
import { goalLabels, levelLabels, type Answers, type LearningPath } from "@/lib/path-types";
import programs from "@/data/programs.json";
import { OPENROUTER_MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 120;

async function generatePath(answers: Answers): Promise<LearningPath> {
  const key = process.env.NEXT_OPEN_ROUTER_API_KEY;
  if (!key) throw new Error("Falta NEXT_OPEN_ROUTER_API_KEY en .env. Configúrala y reinicia el servidor.");
  const courses = getPathCourses(answers);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "DevPathlles" },
    signal: AbortSignal.timeout(110_000),
    body: JSON.stringify({
      models: OPENROUTER_MODELS, max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: 'Personalizas rutas curadas de DevTalles. Responde únicamente JSON válido, sin markdown: {"title":string,"description":string,"advice":string,"recommendedSlugs":string[]}. Escribe en español: title máximo 70 caracteres, description máximo 450, advice máximo 300. No inventes cursos. No cambies la secuencia. Los cursos requeridos y opcionales se conservan automáticamente. recommendedSlugs solo puede contener slugs incluidos en courses cuyo priority sea "recomendado"; si no hay ninguno, devuelve []. Para beginner y basic conserva todos los cursos recomendados; para experienced omite solo los que razonablemente domina y conserva los avanzados. Usa el objetivo para orientar consejos concretos y proyectos. No prometas empleo ni inventes certificaciones.' },
        { role: "user", content: JSON.stringify({ programa: answers.route, nivel: levelLabels[answers.userLevel], userLevel: answers.userLevel, objetivo: goalLabels[answers.goal], courses: courses.map(({ slug, title, summary, stage, priority }) => ({ slug, title, summary, stage, priority })) }) },
      ],
    }),
  });
  if (!response.ok) {
    console.error("OpenRouter rechazó la generación de ruta", { status: response.status });
    throw new Error(response.status === 429 ? "El modelo está ocupado. Espera un momento y vuelve a intentar." : `OpenRouter no pudo generar la ruta (HTTP ${response.status}). Revisa el acceso al modelo y tu API key.`);
  }
  const completion: unknown = await response.json();
  const content = (completion as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.error("OpenRouter devolvió una ruta sin contenido", { response: JSON.stringify(completion).slice(0, 1000) });
    throw new Error("El modelo devolvió una respuesta vacía. Vuelve a intentar.");
  }
  let result: unknown;
  try {
    result = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    console.error("La respuesta del modelo no contiene una ruta JSON válida", { excerpt: content.slice(0, 500) });
    throw new Error("El modelo devolvió una ruta con formato inválido. Vuelve a intentar.");
  }
  if (!result || typeof result !== "object") throw new Error("La respuesta de la IA no contiene una ruta válida.");
  const data = result as Record<string, unknown>;
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 100 || typeof data.description !== "string" || !data.description.trim() || data.description.length > 800 || typeof data.advice !== "string" || !data.advice.trim() || data.advice.length > 600 || !Array.isArray(data.recommendedSlugs)) {
    throw new Error("La ruta generada no cumple el formato del catálogo. Vuelve a intentar.");
  }
  const allowedRecommended = new Set(courses.filter((course) => course.priority === "recomendado").map((course) => course.slug));
  const recommended = data.recommendedSlugs.filter((slug): slug is string => typeof slug === "string" && allowedRecommended.has(slug));
  return {
    id: createHash("sha256").update(JSON.stringify(answers)).digest("hex").slice(0, 16),
    title: data.title, description: data.description, advice: data.advice, answers,
    courses: courses.filter((course) => course.priority !== "recomendado" || answers.userLevel !== "experienced" || recommended.includes(course.slug)),
    createdAt: new Date().toISOString(),
  };
}
const getCachedPath = unstable_cache(generatePath, ["devpathlles-v2", OPENROUTER_MODELS.join(","), JSON.stringify(programs)], { revalidate: 86400 });

export async function POST(request: Request): Promise<Response> {
  let answers: Answers;
  try {
    answers = parseAnswers(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "El cuestionario no es válido." }, { status: 400 });
  }
  try {
    return Response.json(await getCachedPath(answers));
  } catch (error) {
    console.error("No se pudo generar la ruta", { program: answers.program, error: error instanceof Error ? error.message : "Error desconocido" });
    return Response.json({ error: error instanceof Error && error.name !== "TimeoutError" ? error.message : "La generación tardó demasiado. Vuelve a intentar." }, { status: 502 });
  }
}
