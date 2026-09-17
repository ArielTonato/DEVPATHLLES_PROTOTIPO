export type UserLevel = "beginner" | "basic" | "experienced";
export type LearningGoal = "employment" | "freelance" | "personal";
export type CoursePriority = "requerido" | "recomendado" | "opcional";
export interface Alternative {
  key: string;
  stage: number;
  courses: { slug: string; title: string }[];
}
export interface ProgramOption {
  slug: string;
  name: string;
  routes: { title: string; alternatives: Alternative[] }[];
}
export interface Answers {
  program: string;
  route: string;
  userLevel: UserLevel;
  goal: LearningGoal;
  alternatives: Record<string, string>;
}
export interface PathCourse {
  slug: string;
  title: string;
  summary: string;
  hours: number;
  chapters: string[];
  stage: number;
  priority: CoursePriority;
}
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  advice: string;
  answers: Answers;
  courses: PathCourse[];
  createdAt: string;
}
export const levelLabels: Record<UserLevel, string> = {
  beginner: "Empiezo desde cero",
  basic: "Ya conozco las bases",
  experienced: "Tengo experiencia",
};
export const goalLabels: Record<LearningGoal, string> = {
  employment: "Conseguir empleo",
  freelance: "Trabajar como freelance",
  personal: "Crear mi propio proyecto",
};
