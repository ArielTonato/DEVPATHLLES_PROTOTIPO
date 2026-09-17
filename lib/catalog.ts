import "server-only";
import programs from "@/data/programs.json";
import courses from "@/data/courses.json";
import type { Answers, CoursePriority, PathCourse, ProgramOption } from "./path-types";

function getCourse(slug: string): (typeof courses)[number] {
  const course = courses.find((item) => item.slug.toLowerCase() === slug.toLowerCase());
  if (!course) throw new Error(`No se encontró el curso ${slug} en el catálogo.`);
  return course;
}
export function getProgramOptions(): ProgramOption[] {
  return programs.map((program) => ({
    slug: program.slug, name: program.name,
    routes: program.routes.map((route) => ({
      title: route.title,
      alternatives: route.steps.flatMap((step, index) =>
        step.level === "requerido" && step.courses.length > 1
          ? [{ key: String(index), stage: step.stage, courses: step.courses.map((slug) => ({ slug: slug.toLowerCase(), title: getCourse(slug).title })) }]
          : [],
      ),
    })),
  }));
}
export function parseAnswers(value: unknown): Answers {
  if (!value || typeof value !== "object") throw new Error("Completa el cuestionario antes de generar tu ruta.");
  const input = value as Record<string, unknown>;
  const program = getProgramOptions().find((item) => item.slug === input.program);
  const route = program?.routes.find((item) => item.title === input.route);
  if (!program || !route) throw new Error("Selecciona un programa y una especialidad válidos.");
  if (input.userLevel !== "beginner" && input.userLevel !== "basic" && input.userLevel !== "experienced") throw new Error("Selecciona tu nivel de experiencia.");
  if (input.goal !== "employment" && input.goal !== "freelance" && input.goal !== "personal") throw new Error("Selecciona tu objetivo de aprendizaje.");
  if (!input.alternatives || typeof input.alternatives !== "object" || Array.isArray(input.alternatives)) throw new Error("Las preferencias de cursos no son válidas.");
  const selections = input.alternatives as Record<string, unknown>;
  const alternatives = Object.fromEntries(route.alternatives.map((alternative) => {
    const selected = selections[alternative.key] ?? alternative.courses[0].slug;
    if (!alternative.courses.some((course) => course.slug === selected)) throw new Error("Selecciona una alternativa disponible en el programa.");
    return [alternative.key, selected as string];
  }));
  return { program: program.slug, route: route.title, userLevel: input.userLevel, goal: input.goal, alternatives };
}
export function getPathCourses(answers: Answers): PathCourse[] {
  const route = programs.find((program) => program.slug === answers.program)!.routes.find((item) => item.title === answers.route)!;
  return route.steps.flatMap((step, index) => {
    const slugs = step.level === "requerido" && step.courses.length > 1 ? [answers.alternatives[String(index)] ?? step.courses[0]] : step.courses;
    return slugs.map((slug) => {
      const course = getCourse(slug);
      return { slug: course.slug.toLowerCase(), title: course.title, summary: course.summary, hours: course.hours, chapters: course.chapters, stage: step.stage, priority: step.level as CoursePriority };
    });
  }).sort((a, b) => a.stage - b.stage);
}
