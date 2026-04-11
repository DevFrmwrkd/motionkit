const CATEGORY_TO_SKILLS: Record<string, string[]> = {
  intro: ["motion-graphics"],
  outro: ["motion-graphics"],
  title: ["motion-graphics"],
  "lower-third": ["motion-graphics"],
  social: ["motion-graphics"],
  full: ["motion-graphics"],
  chart: ["chart"],
  transition: ["transition"],
  cta: ["cta"],
  map: ["map"],
};

const KEYWORD_SKILLS: Array<{ skill: string; pattern: RegExp }> = [
  {
    skill: "map",
    pattern:
      /\b(map|country|countries|world|globe|route|flight|city|cities|state|states|geo|geographic)\b/i,
  },
  {
    skill: "chart",
    pattern:
      /\b(chart|graph|bar chart|line chart|pie chart|data viz|dashboard|kpi|metrics?)\b/i,
  },
  {
    skill: "transition",
    pattern:
      /\b(transition|wipe|swipe|cross ?fade|dissolve|morph|scene change)\b/i,
  },
  {
    skill: "cta",
    pattern:
      /\b(cta|call to action|subscribe|sign up|buy now|learn more|link in bio|swipe up)\b/i,
  },
  {
    skill: "motion-graphics",
    pattern:
      /\b(title|headline|caption|lower third|intro|outro|opener|broadcast|typography|social)\b/i,
  },
];

export function detectPromptSkills(input: {
  prompt?: string;
  category?: string | null;
}): string[] {
  const detected = new Set<string>();

  if (input.category && CATEGORY_TO_SKILLS[input.category]) {
    for (const skill of CATEGORY_TO_SKILLS[input.category]) {
      detected.add(skill);
    }
  }

  const prompt = input.prompt ?? "";
  for (const candidate of KEYWORD_SKILLS) {
    if (candidate.pattern.test(prompt)) {
      detected.add(candidate.skill);
    }
  }

  if (detected.size === 0) {
    detected.add("motion-graphics");
  }

  return Array.from(detected);
}
