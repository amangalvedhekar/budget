export const experienceCategories = [
  "APP_ISSUE",
  "IMPROVEMENT",
  "NEW_FEATURE",
  "MISCELLANEOUS",
] as const;

export type ExperienceCategory = (typeof experienceCategories)[number];

export interface ShareExperienceInput {
  category: ExperienceCategory;
  title: string;
  details: string;
}

const categoryLabels: Record<ExperienceCategory, string> = {
  APP_ISSUE: "feedback-bug",
  IMPROVEMENT: "feedback-improvement",
  NEW_FEATURE: "feedback-feature",
  MISCELLANEOUS: "feedback-other",
};

export function validateShareExperienceInput(
  input: ShareExperienceInput
): ShareExperienceInput {
  const title = input.title.trim();
  const details = input.details.trim();

  if (!experienceCategories.includes(input.category)) {
    throw new Error("Select a valid feedback category.");
  }
  if (title.length < 3 || title.length > 150) {
    throw new Error("Title must be between 3 and 150 characters.");
  }
  if (details.length < 10 || details.length > 10_000) {
    throw new Error("Details must be between 10 and 10,000 characters.");
  }

  return { ...input, title, details };
}

export function labelForCategory(category: ExperienceCategory): string {
  return categoryLabels[category];
}

export function textToAdf(text: string) {
  return {
    version: 1,
    type: "doc",
    content: text.split(/\r?\n/).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  } as const;
}
