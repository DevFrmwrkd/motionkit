/**
 * Chart skill — knowledge for data visualization presets.
 * Covers bar, line, pie charts using pure SVG (no D3 dependency).
 */
export function getChartSkill(): string {
  return `
═══════════════════════════════════════════════════════════
CHART & DATA VISUALIZATION SKILL — SVG-Based Charts
═══════════════════════════════════════════════════════════

IMPORTANT: Build all charts with raw SVG elements. Do NOT import D3, Chart.js,
Recharts, or any charting library. Remotion presets must be self-contained.

BAR CHART CONSTRUCTION:

  // Data as a schema prop (JSON string or array of objects)
  const data = [
    { label: "Jan", value: 40 },
    { label: "Feb", value: 65 },
    { label: "Mar", value: 50 },
    { label: "Apr", value: 80 },
  ];

  const maxValue = Math.max(...data.map(d => d.value));
  const chartWidth = 1200;
  const chartHeight = 600;
  const barPadding = 20;
  const barWidth = (chartWidth - barPadding * (data.length + 1)) / data.length;

  <svg viewBox={\`0 0 \${chartWidth} \${chartHeight}\`} style={{ width: "100%", height: "100%" }}>
    {data.map((d, i) => {
      const barHeight = (d.value / maxValue) * (chartHeight - 100);
      const x = barPadding + i * (barWidth + barPadding);
      const targetY = chartHeight - 60 - barHeight;

      // Animated height: grow from bottom
      const animDelay = i * 5;
      const progress = interpolate(frame - animDelay, [0, 30], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      const currentHeight = barHeight * progress;
      const y = chartHeight - 60 - currentHeight;

      return (
        <g key={i}>
          <rect x={x} y={y} width={barWidth} height={currentHeight}
            fill={barColor} rx={4} />
          <text x={x + barWidth / 2} y={chartHeight - 35}
            textAnchor="middle" fill={labelColor} fontSize={16}>
            {d.label}
          </text>
          {/* Value label above bar */}
          <text x={x + barWidth / 2} y={y - 10}
            textAnchor="middle" fill={valueColor} fontSize={14}
            opacity={progress}>
            {Math.round(d.value * progress)}
          </text>
        </g>
      );
    })}
    {/* X-axis line */}
    <line x1={0} y1={chartHeight - 60} x2={chartWidth} y2={chartHeight - 60}
      stroke={axisColor} strokeWidth={2} />
  </svg>

HORIZONTAL BAR CHART:
  Similar to vertical but swap x/y axes. Bars grow from left to right.
  Good for ranking data or long category labels.

LINE CHART CONSTRUCTION:

  const points = data.map((d, i) => ({
    x: 80 + (i / (data.length - 1)) * (chartWidth - 160),
    y: chartHeight - 80 - (d.value / maxValue) * (chartHeight - 160),
  }));

  // Animated line drawing with stroke-dashoffset
  const pathD = points.map((p, i) => \`\${i === 0 ? "M" : "L"} \${p.x} \${p.y}\`).join(" ");
  const pathLength = 2000; // Approximate; can calculate more precisely
  const drawn = interpolate(frame, [0, 60], [pathLength, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  <svg viewBox={\`0 0 \${chartWidth} \${chartHeight}\`}>
    {/* Grid lines */}
    {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
      const y = chartHeight - 80 - tick * (chartHeight - 160);
      return <line key={i} x1={80} y1={y} x2={chartWidth - 80} y2={y}
        stroke={gridColor} strokeWidth={1} opacity={0.3} />;
    })}
    {/* Animated line */}
    <path d={pathD} fill="none" stroke={lineColor} strokeWidth={3}
      strokeDasharray={pathLength} strokeDashoffset={drawn}
      strokeLinecap="round" strokeLinejoin="round" />
    {/* Animated dots at data points */}
    {points.map((p, i) => {
      const dotProgress = interpolate(frame - 60 - i * 5, [0, 15], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      return (
        <circle key={i} cx={p.x} cy={p.y} r={6 * dotProgress}
          fill={dotColor} opacity={dotProgress} />
      );
    })}
  </svg>

PIE CHART CONSTRUCTION:

  // Convert data to slices with start/end angles
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  const slices = data.map((d, i) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360;
    return { ...d, startAngle, endAngle, index: i };
  });

  // Helper: polar to cartesian
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Helper: SVG arc path
  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return \`M \${cx} \${cy} L \${start.x} \${start.y} A \${r} \${r} 0 \${largeArc} 0 \${end.x} \${end.y} Z\`;
  }

  // Animated reveal: sweep clockwise
  const sweepAngle = interpolate(frame, [0, 60], [0, 360], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  {slices.map((s, i) => {
    const visible = s.startAngle < sweepAngle;
    const clampedEnd = Math.min(s.endAngle, sweepAngle);
    if (!visible) return null;
    const d = describeArc(cx, cy, radius, s.startAngle, clampedEnd);
    return <path key={i} d={d} fill={colors[i % colors.length]} />;
  })}

ANIMATED DATA TRANSITIONS:
  When showing data changes, interpolate between old and new values:
  const displayValue = interpolate(frame, [transitionStart, transitionStart + 30],
    [oldValue, newValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

AXIS LABELS AND LEGENDS:

  Y-Axis Labels:
  {yTicks.map((tick, i) => {
    const y = chartHeight - 80 - (tick / maxValue) * (chartHeight - 160);
    return (
      <text key={i} x={70} y={y + 5} textAnchor="end" fill={labelColor} fontSize={12}>
        {tick}
      </text>
    );
  })}

  Legend:
  <g transform={\`translate(\${chartWidth - 200}, 40)\`}>
    {data.map((d, i) => (
      <g key={i} transform={\`translate(0, \${i * 25})\`}>
        <rect width={14} height={14} fill={colors[i]} rx={2} />
        <text x={20} y={12} fill={labelColor} fontSize={13}>{d.label}</text>
      </g>
    ))}
  </g>

DATA POINT ANIMATIONS:
  - Grow bars from bottom (most intuitive)
  - Draw lines left-to-right with stroke-dashoffset
  - Pie slices sweep clockwise from 12 o'clock
  - Dots pop in after their line segment draws
  - Value labels count up to final number
  - Use staggered delays (i * 5 frames) for sequential bar reveal

RECOMMENDED COLOR PALETTES:

  Corporate: ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a"]
  Pastel: ["#93c5fd", "#c4b5fd", "#f9a8d4", "#fdba74", "#fde047", "#86efac"]
  Vibrant: ["#f43f5e", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899"]
  Monochrome: Use a single hue with varying lightness.
  Dark theme: Use brighter, more saturated colors on dark backgrounds.

TIPS:
- Always add a title and optional subtitle above the chart.
- Animate the title in before the data for visual hierarchy.
- Round corners on bars (rx={4}) for a modern look.
- Use semi-transparent grid lines (opacity 0.2-0.3).
- Reserve 80-100px margins for axis labels.
- For large datasets, consider showing only top N items.
- Number formatting: use toLocaleString() for commas, add "$", "%", etc. as needed.
`;
}
