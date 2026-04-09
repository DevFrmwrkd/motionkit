/**
 * Map skill — knowledge for geographic/map-based presets
 * using SVG paths, route animation, and pin markers.
 */
export function getMapSkill(): string {
  return `
═══════════════════════════════════════════════════════════
MAP & GEOGRAPHIC SKILL — SVG Maps, Routes & Pins
═══════════════════════════════════════════════════════════

IMPORTANT: Build all maps with raw SVG. Do NOT import Mapbox, Leaflet,
or any mapping library. Use simplified SVG outlines for geographic shapes.

SVG PATH-BASED GEOGRAPHIC SHAPES:

World Map Simplified (use inline SVG paths):
  - Define continent or country outlines as SVG <path> elements.
  - Use viewBox to control the visible region.
  - Scale and position paths relative to the SVG viewBox.

  <svg viewBox="0 0 1000 500" style={{ width: "100%", height: "100%" }}>
    {/* Each region is a path with a known id */}
    <path id="north-america" d="M 150 80 L 180 60 ..." fill={regionColor} stroke={borderColor} strokeWidth={1} />
    <path id="europe" d="M 470 90 L 490 85 ..." fill={regionColor} stroke={borderColor} strokeWidth={1} />
  </svg>

US State Map Pattern:
  // Store state paths as an array of objects
  const states = [
    { id: "CA", name: "California", path: "M 50 200 L 60 180 ...", center: { x: 55, y: 210 } },
    { id: "TX", name: "Texas", path: "M 300 350 L 320 340 ...", center: { x: 310, y: 360 } },
    // ... more states
  ];

  {states.map((state) => (
    <path key={state.id} d={state.path}
      fill={highlightedStates.includes(state.id) ? highlightColor : defaultColor}
      stroke={borderColor} strokeWidth={0.5} />
  ))}

Simple Shapes for Common Regions:
  // For simpler use cases, use rectangles/circles positioned on a grid
  // to represent regions abstractly (infographic style)

ROUTE ANIMATION ALONG PATHS:

Animated Travel Route:
  const routePath = "M 100 300 C 200 100 400 100 500 250 S 700 400 800 200";
  const routeLength = 1200; // Approximate total path length

  // Line drawing animation
  const drawnLength = interpolate(frame, [0, 90], [routeLength, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  <path d={routePath} fill="none" stroke={routeColor} strokeWidth={3}
    strokeDasharray={routeLength} strokeDashoffset={drawnLength}
    strokeLinecap="round" />

Moving Dot Along Path (plane/car icon):
  // Calculate position along path at current progress
  // Use a <circle> or icon that follows the SVG path
  const progress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Approximate position along a bezier curve:
  function getPointOnCubicBezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return {
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
    };
  }

  // Or for a polyline (series of straight segments):
  function getPointOnPolyline(points, t) {
    const totalLength = points.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const dx = p.x - points[i-1].x;
      const dy = p.y - points[i-1].y;
      return sum + Math.sqrt(dx*dx + dy*dy);
    }, 0);
    const targetDist = t * totalLength;
    let accumulated = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      const segLen = Math.sqrt(dx*dx + dy*dy);
      if (accumulated + segLen >= targetDist) {
        const segT = (targetDist - accumulated) / segLen;
        return {
          x: points[i-1].x + dx * segT,
          y: points[i-1].y + dy * segT,
        };
      }
      accumulated += segLen;
    }
    return points[points.length - 1];
  }

Dashed Route Trail:
  <path d={routePath} fill="none" stroke={routeColor} strokeWidth={2}
    strokeDasharray="8 4"
    strokeDashoffset={-frame * 2} // Animated marching ants
  />

REGION HIGHLIGHTING WITH COLOR FILLS:

Animated Region Focus:
  const regionOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const regionColor = interpolateColors(frame, [20, 40], [defaultColor, highlightColor]);
  <path d={regionPath} fill={regionColor} opacity={regionOpacity} />

Sequential Region Highlighting:
  {regions.map((region, i) => {
    const highlightStart = 30 + i * 15;
    const highlighted = interpolate(frame, [highlightStart, highlightStart + 15], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const fill = interpolateColors(frame, [highlightStart, highlightStart + 15],
      [defaultColor, highlightColor]);
    return <path key={region.id} d={region.path} fill={fill} />;
  })}

Pulsing Region (for emphasis):
  const pulseOpacity = 0.6 + Math.sin(frame * 0.2) * 0.2;
  <path d={regionPath} fill={highlightColor} opacity={pulseOpacity} />

Heat Map Effect:
  // Color regions by value using interpolateColors
  const regionFill = interpolateColors(
    region.value / maxValue, [0, 0.5, 1],
    ["#22c55e", "#eab308", "#ef4444"]
  );

PIN / MARKER DROP ANIMATIONS:

Bouncing Pin Drop:
  const pinDrop = spring({
    frame: frame - pinDelay,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.6 },
  });
  const pinY = interpolate(pinDrop, [0, 1], [-50, 0]); // Drop from above
  const pinScale = pinDrop; // Scale from 0 to 1

  <g transform={\`translate(\${pinX}, \${pinY + pinTargetY}) scale(\${pinScale})\`}>
    {/* Pin shape */}
    <path d="M 0 -30 C -15 -30 -15 -10 0 0 C 15 -10 15 -30 0 -30 Z"
      fill={pinColor} />
    <circle cx={0} cy={-20} r={5} fill="#fff" />
  </g>

  // Shadow grows as pin drops
  const shadowScale = interpolate(pinDrop, [0, 1], [0.3, 1]);
  const shadowOpacity = interpolate(pinDrop, [0, 1], [0, 0.3]);
  <ellipse cx={pinX} cy={pinTargetY + 5} rx={10 * shadowScale} ry={4 * shadowScale}
    fill="#000" opacity={shadowOpacity} />

Sequential Pin Drops:
  {pins.map((pin, i) => {
    const delay = 20 + i * 10; // Stagger each pin
    const drop = spring({
      frame: frame - delay, fps,
      config: { damping: 12, stiffness: 180 },
    });
    // ... render each pin with its own spring
  })}

Animated Label Popover:
  // After pin lands, show a label
  const labelDelay = pinDelay + 15;
  const labelScale = spring({
    frame: frame - labelDelay, fps,
    config: { damping: 15, stiffness: 200 },
  });
  <g transform={\`translate(\${pinX}, \${pinTargetY - 45}) scale(\${labelScale})\`}>
    <rect x={-50} y={-20} width={100} height={28} rx={4}
      fill="rgba(0,0,0,0.8)" />
    <text x={0} y={-2} textAnchor="middle" fill="#fff" fontSize={13}>
      {pin.label}
    </text>
    {/* Triangle pointer */}
    <polygon points="-6,8 6,8 0,14" fill="rgba(0,0,0,0.8)" />
  </g>

CONNECTING LINES BETWEEN PINS:
  {connections.map((conn, i) => {
    const lineProgress = interpolate(frame - (40 + i * 10), [0, 20], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const endX = conn.from.x + (conn.to.x - conn.from.x) * lineProgress;
    const endY = conn.from.y + (conn.to.y - conn.from.y) * lineProgress;
    return (
      <line key={i}
        x1={conn.from.x} y1={conn.from.y}
        x2={endX} y2={endY}
        stroke={connectionColor} strokeWidth={2} strokeDasharray="6 3" />
    );
  })}

DESIGN TIPS:
  - Use muted, desaturated colors for base map regions.
  - Highlighted regions should be 2-3 shades brighter or use the accent color.
  - Keep borders thin (0.5-1px) to avoid visual noise.
  - Animate camera/viewBox for zoom effects on specific regions.
  - Add a subtle drop shadow to the entire map SVG for depth.
  - For city markers, use circles (r=4-6) instead of complex pin shapes for cleanliness.
  - Include a title and optional legend as overlay text.
  - Route animations should be slower than UI animations (60-120 frames for a route draw).
  - For abstract/infographic maps, geometric simplification is preferred over geographic accuracy.
`;
}
