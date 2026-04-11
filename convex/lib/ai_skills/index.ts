import { getBasePrompt } from "./base";
import { getMotionGraphicsSkill } from "./motion_graphics";
import { getChartSkill } from "./chart";
import { getTransitionSkill } from "./transition";
import { getCtaSkill } from "./cta";
import { getMapSkill } from "./map";

/**
 * GPT-owned skill registry used by the AI edit loop. The first generation may
 * inject multiple skills, while follow-ups can skip skills the conversation
 * already included to avoid repeating large prompt blocks.
 */
export const SKILL_NAMES = [
  "motion-graphics",
  "chart",
  "transition",
  "cta",
  "map",
] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

const SKILL_PROMPTS: Record<SkillName, () => string> = {
  "motion-graphics": getMotionGraphicsSkill,
  chart: getChartSkill,
  transition: getTransitionSkill,
  cta: getCtaSkill,
  map: getMapSkill,
};

const CATEGORY_TO_SKILLS: Record<string, SkillName[]> = {
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

const KEYWORD_SKILLS: Array<{ skill: SkillName; pattern: RegExp }> = [
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

function dedupeSkills(skills: readonly SkillName[]): SkillName[] {
  return Array.from(new Set(skills));
}

export function isSkillName(value: string): value is SkillName {
  return (SKILL_NAMES as readonly string[]).includes(value);
}

export function detectSkills(input: {
  prompt?: string;
  category?: string | null;
}): SkillName[] {
  const detected: SkillName[] = [];

  if (input.category && CATEGORY_TO_SKILLS[input.category]) {
    detected.push(...CATEGORY_TO_SKILLS[input.category]);
  }

  const prompt = input.prompt ?? "";
  for (const candidate of KEYWORD_SKILLS) {
    if (candidate.pattern.test(prompt)) {
      detected.push(candidate.skill);
    }
  }

  if (detected.length === 0) {
    detected.push("motion-graphics");
  }

  return dedupeSkills(detected);
}

export function getCombinedSkillContent(skills: readonly SkillName[]): string {
  const base = getBasePrompt();
  const uniqueSkills = dedupeSkills(skills);
  if (uniqueSkills.length === 0) {
    return base;
  }

  return [base, ...uniqueSkills.map((skill) => SKILL_PROMPTS[skill]())].join("\n");
}

export function buildSystemPrompt(input: {
  prompt?: string;
  category?: string | null;
  previouslyUsedSkills?: string[];
}) {
  const detectedSkills = detectSkills(input);
  const previouslyUsedSkills = (input.previouslyUsedSkills ?? []).filter(isSkillName);
  const injectedSkills = detectedSkills.filter(
    (skill) => !previouslyUsedSkills.includes(skill)
  );
  const skippedSkills = detectedSkills.filter((skill) =>
    previouslyUsedSkills.includes(skill)
  );

  return {
    detectedSkills,
    injectedSkills,
    skippedSkills,
    systemPrompt: getCombinedSkillContent(injectedSkills),
  };
}

export function getSkillForCategory(category?: string): string {
  return getCombinedSkillContent(detectSkills({ category }));
}
