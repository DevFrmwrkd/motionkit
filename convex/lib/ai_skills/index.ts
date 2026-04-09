import { getBasePrompt } from "./base";
import { getMotionGraphicsSkill } from "./motion_graphics";
import { getChartSkill } from "./chart";
import { getTransitionSkill } from "./transition";
import { getCtaSkill } from "./cta";
import { getMapSkill } from "./map";

/**
 * Returns the combined system prompt for a given preset category.
 * Always includes the base prompt, plus the category-specific skill if available.
 */
export function getSkillForCategory(category?: string): string {
  const base = getBasePrompt();

  if (!category) {
    return base;
  }

  const skillMap: Record<string, () => string> = {
    // Motion graphics family
    intro: getMotionGraphicsSkill,
    outro: getMotionGraphicsSkill,
    title: getMotionGraphicsSkill,
    "lower-third": getMotionGraphicsSkill,
    social: getMotionGraphicsSkill,
    full: getMotionGraphicsSkill,

    // Specialized skills
    chart: getChartSkill,
    transition: getTransitionSkill,
    cta: getCtaSkill,
    map: getMapSkill,
  };

  const skillFn = skillMap[category];
  if (skillFn) {
    return base + "\n" + skillFn();
  }

  return base;
}
