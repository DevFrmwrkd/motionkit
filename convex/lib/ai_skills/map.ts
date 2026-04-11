/**
 * Map skill — knowledge for geographic/map-based presets.
 *
 * The host runtime injects a `mapHelpers` object into the generated preset scope
 * (see app/src/lib/preset-runtime/mapHelpers.ts). The AI must use it instead of
 * inventing SVG path data, which historically produced map-shaped but
 * geographically bogus outputs.
 */
export function getMapSkill(): string {
  return `
═══════════════════════════════════════════════════════════
MAP & GEOGRAPHIC SKILL — Real Geography via mapHelpers
═══════════════════════════════════════════════════════════

CRITICAL RULE: You MUST NEVER invent SVG path data for countries, states, or
continents. The host injects a \`mapHelpers\` object into your scope that returns
real, projected SVG paths from Mike Bostock's public-domain TopoJSON atlases.

Calling \`mapHelpers.getCountryPath("US", { width, height })\` returns a genuine
United States shape. Writing \`d="M 150 80 L 180 60 ..."\` by hand does NOT.

═══════════════════════════════════════════════════════════
mapHelpers API (available in every preset — do NOT import)
═══════════════════════════════════════════════════════════

mapHelpers.getCountryPath(country, bounds)
  Returns { id, name, d, centroid } for a single country fitted to the bounds.
  \`country\` accepts ISO alpha-2 codes ("US", "DE", "JP") or English names.
  \`bounds\` is { width, height, projection?, padding? }.
  projection defaults to "naturalEarth". Supported values:
    "mercator" | "equirectangular" | "naturalEarth" | "albers" | "albersUsa"

mapHelpers.getWorldCountries(bounds)
  Returns an array of { id, name, d, centroid } for every country on Earth,
  all projected into the same viewBox. Use this to render a base world map.

mapHelpers.getStatePath(postal, bounds)
  Returns { id, name, d, centroid } for a single US state ("CA", "TX", etc.).
  Defaults to "albersUsa" projection so Alaska + Hawaii appear correctly.

mapHelpers.getUsStates(bounds)
  Returns an array of all 50 US states + DC, projected into the given viewBox.

mapHelpers.projectLatLon([lon, lat], bounds, dataset?)
  Projects a single [longitude, latitude] point into viewBox pixel coordinates
  using the SAME projection a getWorldCountries/getUsStates call with the same
  bounds would use. Returns { x, y, clipped }.
  \`dataset\` is "world" (default) or "us".
  Use this to place pins, routes, and labels on top of real country shapes.

mapHelpers.projectRoute(points, bounds, dataset?)
  Projects an array of [lon, lat] points into a ready-to-render SVG path
  (returns { d, projectedPoints }). Use for flight paths, travel routes, etc.

═══════════════════════════════════════════════════════════
CANONICAL WORLD MAP PATTERN
═══════════════════════════════════════════════════════════

  const Component: React.FC<Record<string, unknown>> = (props) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const highlightColor = (props.highlightColor as string) ?? "#f59e0b";
    const baseColor = (props.baseColor as string) ?? "#1e293b";
    const borderColor = (props.borderColor as string) ?? "#334155";
    const highlighted = (props.highlightedCountries as string[]) ?? ["US", "DE", "JP"];

    const bounds = { width, height, projection: "naturalEarth" as const, padding: 60 };
    const countries = mapHelpers.getWorldCountries(bounds);

    return (
      <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
        <svg viewBox={\`0 0 \${width} \${height}\`} style={{ width: "100%", height: "100%" }}>
          {countries.map((c) => {
            const isHighlighted = highlighted.includes(c.id) || highlighted.some(h => c.name.includes(h));
            const revealDelay = isHighlighted ? 30 : 0;
            const fillProgress = interpolate(frame - revealDelay, [0, 20], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            const fill = isHighlighted
              ? interpolateColors(fillProgress, [0, 1], [baseColor, highlightColor])
              : baseColor;
            return (
              <path key={c.id} d={c.d} fill={fill}
                stroke={borderColor} strokeWidth={0.5} />
            );
          })}
        </svg>
      </AbsoluteFill>
    );
  };

═══════════════════════════════════════════════════════════
FLIGHT ROUTE WITH ANIMATED LINE + MOVING PLANE PIN
═══════════════════════════════════════════════════════════

  // Waypoints as [longitude, latitude]
  const waypoints = [
    [-74.006, 40.7128],   // New York
    [-0.1276, 51.5074],   // London
    [139.6917, 35.6895],  // Tokyo
  ] as Array<[number, number]>;

  const bounds = { width, height, projection: "naturalEarth" as const, padding: 60 };
  const countries = mapHelpers.getWorldCountries(bounds);
  const { d: routeD, projectedPoints } = mapHelpers.projectRoute(waypoints, bounds);

  // Approximate total length for stroke-dashoffset animation.
  const routeLength = projectedPoints.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const dx = p[0] - projectedPoints[i - 1][0];
    const dy = p[1] - projectedPoints[i - 1][1];
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const drawProgress = interpolate(frame, [20, 100], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const drawn = routeLength * (1 - drawProgress);

  // Plane position along the polyline
  function pointAtT(pts: Array<[number, number]>, t: number) {
    if (pts.length < 2) return pts[0] ?? [0, 0];
    const totalLen = pts.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const dx = p[0] - pts[i - 1][0];
      const dy = p[1] - pts[i - 1][1];
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0);
    let target = t * totalLen;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (target <= segLen) {
        const k = target / segLen;
        return [pts[i - 1][0] + dx * k, pts[i - 1][1] + dy * k] as [number, number];
      }
      target -= segLen;
    }
    return pts[pts.length - 1];
  }
  const [planeX, planeY] = pointAtT(projectedPoints, drawProgress);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <svg viewBox={\`0 0 \${width} \${height}\`} style={{ width: "100%", height: "100%" }}>
        {countries.map((c) => (
          <path key={c.id} d={c.d} fill="#1e293b" stroke="#334155" strokeWidth={0.5} />
        ))}
        {/* Route path */}
        <path d={routeD} fill="none" stroke="#f59e0b" strokeWidth={3}
          strokeDasharray={routeLength} strokeDashoffset={drawn}
          strokeLinecap="round" />
        {/* Moving plane icon */}
        <circle cx={planeX} cy={planeY} r={8} fill="#fbbf24" />
        {/* Origin/destination markers */}
        {projectedPoints.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#fff" stroke="#f59e0b" strokeWidth={2} />
        ))}
      </svg>
    </AbsoluteFill>
  );

═══════════════════════════════════════════════════════════
PIN DROP ANIMATION ON REAL COORDINATES
═══════════════════════════════════════════════════════════

  const cities = [
    { name: "New York", lonLat: [-74.006, 40.7128] as [number, number] },
    { name: "Berlin",   lonLat: [13.405, 52.520]   as [number, number] },
    { name: "Tokyo",    lonLat: [139.6917, 35.6895] as [number, number] },
  ];

  const bounds = { width, height, padding: 60 };
  const countries = mapHelpers.getWorldCountries(bounds);

  {cities.map((city, i) => {
    const { x, y } = mapHelpers.projectLatLon(city.lonLat, bounds);
    const dropDelay = 30 + i * 10;
    const drop = spring({
      frame: frame - dropDelay, fps,
      config: { damping: 12, stiffness: 180, mass: 0.6 },
    });
    const pinY = y - 50 + drop * 50;
    const pinScale = drop;
    return (
      <g key={city.name} transform={\`translate(\${x}, \${pinY}) scale(\${pinScale})\`}>
        <path d="M 0 -30 C -12 -30 -12 -12 0 0 C 12 -12 12 -30 0 -30 Z" fill="#f43f5e" />
        <circle cx={0} cy={-20} r={4} fill="#fff" />
      </g>
    );
  })}

═══════════════════════════════════════════════════════════
US STATE MAP WITH SEQUENTIAL HIGHLIGHT
═══════════════════════════════════════════════════════════

  const bounds = { width, height, projection: "albersUsa" as const, padding: 40 };
  const states = mapHelpers.getUsStates(bounds);
  const highlightOrder = ["CA", "TX", "NY", "FL"];

  {states.map((s) => {
    const highlightIndex = highlightOrder.findIndex(
      h => s.id === h || s.name.toUpperCase() === h
    );
    if (highlightIndex === -1) {
      return <path key={s.id} d={s.d} fill="#1e293b" stroke="#475569" strokeWidth={0.5} />;
    }
    const start = 30 + highlightIndex * 20;
    const p = interpolate(frame, [start, start + 15], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const fill = interpolateColors(p, [0, 1], ["#1e293b", "#f59e0b"]);
    return <path key={s.id} d={s.d} fill={fill} stroke="#475569" strokeWidth={0.5} />;
  })}

═══════════════════════════════════════════════════════════
REFERENCE IMAGE AS BASEMAP (user-uploaded map)
═══════════════════════════════════════════════════════════

If the user provides a reference image that clearly depicts a map, treat the
image as the basemap. Render it with <Img src={referenceImageUrl} /> sized to
fill the composition, and only generate overlay animations (pins, labels, routes)
positioned in PIXEL coordinates relative to the composition width/height.
Do NOT attempt to reproduce the map itself. Ask the user to approximate positions
or just use grid-placed markers.

═══════════════════════════════════════════════════════════
DESIGN TIPS
═══════════════════════════════════════════════════════════
- Base country fill should be muted (#1e293b, #334155) so highlights pop.
- Borders: 0.3–0.8px. Anything thicker adds visual noise at 1080p.
- For full-world animations, use projection: "naturalEarth" (most natural shapes).
- For US-focused animations, use projection: "albersUsa" (places AK + HI inline).
- For dramatic single-country zooms, pass that country's feature to getCountryPath;
  the projection auto-fits.
- Route draws should take 60–120 frames. Faster feels frantic.
- Sequential pin drops look best with 8–15 frame stagger.
- Always call mapHelpers with the real composition width/height from useVideoConfig().
- NEVER hand-write country or state path data. If mapHelpers doesn't know a name,
  fall back to an abstract representation (circle, label) rather than inventing geometry.
`;
}
