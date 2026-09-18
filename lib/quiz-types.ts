export interface QuizQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctOption: number;
  explanation: string;
}

export interface Quiz {
  nodeKey: string;
  title: string;
  kind: "course" | "chapter";
  passPercentage: number;
  questions: QuizQuestion[];
}

export interface QuizTarget {
  courseSlug: string;
  courseTitle: string;
  chapterTitle: string | null;
}
