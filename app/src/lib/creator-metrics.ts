export interface CreatorPresetSummary {
  _id: string;
  _creationTime?: number;
  name: string;
  description?: string;
  category: string;
  downloads?: number;
  voteScore?: number;
  viewCount?: number;
  cloneCount?: number;
  price?: number;
  isPremium?: boolean;
  isPublic: boolean;
  status: string;
}

export interface CreatorRenderJobSummary {
  _id: string;
  status: string;
  renderEngine: string;
  startedAt?: number;
  completedAt?: number;
  outputSize?: number;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function getCreatorMetrics(
  presets: CreatorPresetSummary[],
  renderJobs: CreatorRenderJobSummary[]
) {
  const totalViews = presets.reduce((sum, preset) => sum + (preset.viewCount ?? 0), 0);
  const totalDownloads = presets.reduce(
    (sum, preset) => sum + (preset.downloads ?? 0),
    0
  );
  const totalVotes = presets.reduce((sum, preset) => sum + (preset.voteScore ?? 0), 0);
  const totalClones = presets.reduce(
    (sum, preset) => sum + (preset.cloneCount ?? 0),
    0
  );
  const publishedPresets = presets.filter(
    (preset) => preset.status === "published" && preset.isPublic
  );
  const draftPresets = presets.filter((preset) => preset.status === "draft");
  const premiumPresets = presets.filter(
    (preset) => (preset.isPremium ?? false) || (preset.price ?? 0) > 0
  );
  const estimatedRevenue = premiumPresets.reduce(
    (sum, preset) => sum + (preset.price ?? 0) * (preset.downloads ?? 0),
    0
  );
  const completedRenders = renderJobs.filter((job) => job.status === "done").length;
  const failedRenders = renderJobs.filter((job) => job.status === "failed").length;
  const averageDownloads = presets.length === 0 ? 0 : totalDownloads / presets.length;

  const topPresets = [...presets].sort((a, b) => {
    const scoreA =
      (a.viewCount ?? 0) + (a.downloads ?? 0) * 5 + (a.voteScore ?? 0) * 10;
    const scoreB =
      (b.viewCount ?? 0) + (b.downloads ?? 0) * 5 + (b.voteScore ?? 0) * 10;
    return scoreB - scoreA;
  });

  const recentPresets = [...presets].sort(
    (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0)
  );

  const revenueBreakdown = premiumPresets
    .map((preset) => ({
      ...preset,
      revenue: (preset.price ?? 0) * (preset.downloads ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalViews,
    totalDownloads,
    totalVotes,
    totalClones,
    publishedCount: publishedPresets.length,
    draftCount: draftPresets.length,
    premiumCount: premiumPresets.length,
    estimatedRevenue,
    completedRenders,
    failedRenders,
    averageDownloads,
    topPresets,
    recentPresets,
    revenueBreakdown,
  };
}
