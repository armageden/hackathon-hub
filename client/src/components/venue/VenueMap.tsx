'use client';

import { useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Line } from 'react-konva';
import type { VenueLocation, VenueAssignment } from '@/types/api';

type VenueLocationGeometry = VenueLocation & {
  position_x?: number | null;
  position_y?: number | null;
  size_width?: number | null;
  size_height?: number | null;
};

interface VenueMapProps {
  locations: VenueLocation[];
  assignments: VenueAssignment[];
  selectedLocationId?: string | null;
  onLocationClick: (location: VenueLocation) => void;
  onLocationDragEnd: (locationId: string, x: number, y: number) => void;
  onAssignmentDragEnd?: (assignmentId: string, locationId: string, x: number, y: number) => void;
  conflicts?: Array<{ locationId: string; overlapArea: { x: number; y: number; width: number; height: number } }>;
  width: number;
  height: number;
  scale?: number;
  showGrid?: boolean;
  gridSize?: number;
}

// Konva paints to a <canvas>, and canvas fillStyle/strokeStyle cannot resolve
// CSS custom properties like `var(--color-team-1)` — invalid values fall back
// to black. Resolve each variable to its computed hex at render time instead.
const colorCache = new Map<string, string>();
function resolveColor(color: string): string {
  if (!color.startsWith("var(")) return color;
  const cached = colorCache.get(color);
  if (cached) return cached;
  const name = color.slice(4, -1).trim();
  const value =
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const resolved = value || "#6366f1";
  colorCache.set(color, resolved);
  return resolved;
}

const LOCATION_TYPE_COLORS: Record<string, string> = {
  room: 'var(--color-venue-room)',
  booth: 'var(--color-venue-booth)',
  table: 'var(--color-venue-table)',
  stage: 'var(--color-venue-stage)',
  lab: 'var(--color-venue-lab)',
  desk: 'var(--color-venue-desk)',
};

const LOCATION_TYPE_SHAPES: Record<string, 'rect' | 'circle' | 'polygon'> = {
  room: 'rect',
  booth: 'rect',
  table: 'circle',
  stage: 'rect',
  lab: 'rect',
  desk: 'rect',
};

export function VenueMap({
  locations,
  assignments,
  selectedLocationId,
  onLocationClick,
  onLocationDragEnd,
  conflicts = [],
  width,
  height,
  scale = 1,
  showGrid = true,
  gridSize = 20,
}: VenueMapProps) {
  const stageScale = useMemo(() => scale, [scale]);

  const getLocationColor = (type: string) =>
    resolveColor(LOCATION_TYPE_COLORS[type] || 'var(--color-chart-1)');

  const renderLocationShape = (location: VenueLocation, x: number, y: number, w: number, h: number) => {
    const shapeType = LOCATION_TYPE_SHAPES[location.location_type] || 'rect';
    const color = getLocationColor(location.location_type);
    const isSelected = selectedLocationId === location.id;
    const hasConflict = conflicts.some(c => c.locationId === location.id);

    if (shapeType === 'circle') {
      const radius = Math.min(w, h) / 2;
      return (
        <Group key={location.id} x={x + radius} y={y + radius} draggable onDragEnd={e => onLocationDragEnd(location.id, e.target.x(), e.target.y())}>
          <Circle
            radius={radius}
            fill={color}
            opacity={0.2}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
            strokeDasharray={hasConflict ? [10, 5] : undefined}
            shadowColor={hasConflict ? 'red' : 'transparent'}
            shadowBlur={hasConflict ? 15 : 0}
            shadowOpacity={hasConflict ? 0.5 : 0}
          />
          <Text
            x={0}
            y={0}
            text={location.name}
            fontSize={12}
            fontFamily="var(--font-sans)"
            fill="white"
            align="center"
            verticalAlign="middle"
            pointerEvents="none"
          />
          {hasConflict && (
            <Circle
              radius={radius - 4}
              stroke="red"
              strokeWidth={2}
              strokeDasharray={[5, 5]}
              fill="transparent"
            />
          )}
        </Group>
      );
    }

    return (
      <Group key={location.id} x={x} y={y} draggable onDragEnd={e => onLocationDragEnd(location.id, e.target.x(), e.target.y())}>
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={color}
          opacity={0.15}
          stroke={color}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={hasConflict ? [10, 5] : undefined}
          cornerRadius={8}
          shadowColor={hasConflict ? 'red' : 'transparent'}
          shadowBlur={hasConflict ? 15 : 0}
          shadowOpacity={hasConflict ? 0.5 : 0}
        />
        <Text
          x={w / 2}
          y={h / 2}
          text={location.name}
          fontSize={12}
          fontFamily="var(--font-sans)"
          fill="white"
          align="center"
          verticalAlign="middle"
          pointerEvents="none"
        />
        <Text
          x={w / 2}
          y={h / 2 + 20}
          text={`Cap: ${location.capacity || 'N/A'}`}
          fontSize={10}
          fontFamily="var(--font-mono)"
          fill={resolveColor('var(--color-fg-muted)')}
          align="center"
          pointerEvents="none"
        />
        {hasConflict && (
          <Rect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            stroke="red"
            strokeWidth={2}
            strokeDasharray={[5, 5]}
            fill="transparent"
            cornerRadius={6}
          />
        )}
      </Group>
    );
  };

  const renderAssignments = (location: VenueLocation, x: number, y: number, h: number) => {
    const locationAssignments = assignments.filter(a => a.venue_location_id === location.id);
    if (locationAssignments.length === 0) return null;

    return (
      <Group key={`assignments-${location.id}`}>
        {locationAssignments.slice(0, 3).map((assignment, index) => {
          const teamColors = [
            'var(--color-team-1)',
            'var(--color-team-2)',
            'var(--color-team-3)',
            'var(--color-team-4)',
            'var(--color-team-5)',
            'var(--color-team-6)',
          ];
          const color = resolveColor(teamColors[index % teamColors.length]);

          return (
            <Circle
              key={assignment.id}
              x={x + 15 + index * 22}
              y={y + h - 20}
              radius={12}
              fill={color}
              opacity={0.9}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}
        {locationAssignments.length > 3 && (
          <Text
            x={x + 15 + 3 * 22}
            y={y + h - 20}
            text={`+${locationAssignments.length - 3}`}
            fontSize={10}
            fontFamily="var(--font-mono)"
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        )}
      </Group>
    );
  };

  return (
    <div className="relative" style={{ width, height }}>
      <Stage width={width} height={height} scaleX={stageScale} scaleY={stageScale}>
        <Layer>
          {/* Grid Background */}
          {showGrid && (
            <Group>
              {Array.from({ length: Math.ceil(width / gridSize) }).map((_, i) => (
                <Line
                  key={`vgrid-${i}`}
                  points={[i * gridSize, 0, i * gridSize, height]}
                  stroke={resolveColor('var(--color-border-subtle)')}
                  strokeWidth={0.5}
                  opacity={0.5}
                />
              ))}
              {Array.from({ length: Math.ceil(height / gridSize) }).map((_, i) => (
                <Line
                  key={`hgrid-${i}`}
                  points={[0, i * gridSize, width, i * gridSize]}
                  stroke={resolveColor('var(--color-border-subtle)')}
                  strokeWidth={0.5}
                  opacity={0.5}
                />
              ))}
            </Group>
          )}

          {/* Locations */}
          {locations.map(location => {
            const loc = location as VenueLocationGeometry;
            return (
            <Group
              key={location.id}
              onClick={() => onLocationClick(location)}
            >
              {renderLocationShape(location, loc.position_x || 0, loc.position_y || 0, loc.size_width || 100, loc.size_height || 100)}
              {renderAssignments(location, loc.position_x || 0, loc.position_y || 0, loc.size_height || 100)}
            </Group>
            );
          })}

          {/* Conflict Overlays */}
          {conflicts.map(conflict => (
            <Rect
              key={`conflict-${conflict.locationId}`}
              x={conflict.overlapArea.x}
              y={conflict.overlapArea.y}
              width={conflict.overlapArea.width}
              height={conflict.overlapArea.height}
              fill="red"
              opacity={0.3}
              stroke="red"
              strokeWidth={2}
              strokeDasharray={[10, 5]}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

// Minimap Component
interface MinimapProps {
  locations: VenueLocation[];
  viewport: { x: number; y: number; width: number; height: number };
  scale: number;
  onNavigate: (x: number, y: number) => void;
  width?: number;
  height?: number;
}

export function Minimap({ locations, viewport, scale, onNavigate, width = 200, height = 150 }: MinimapProps) {
  const scaleX = width / (scale * 1000); // Assuming 1000 is max canvas width
  const scaleY = height / (scale * 1000);

  return (
    <div className="absolute bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-xl">
      <div className="text-xs text-gray-400 mb-1">Minimap</div>
      <div
        className="relative"
        style={{ width, height }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / scaleX;
          const y = (e.clientY - rect.top) / scaleY;
          onNavigate(x, y);
        }}
      >
        <Stage width={width} height={height}>
          <Layer>
            {/* Locations on minimap */}
            {locations.map(location => {
              const loc = location as VenueLocationGeometry;
              return (
              <Rect
                key={location.id}
                x={(loc.position_x || 0) * scaleX}
                y={(loc.position_y || 0) * scaleY}
                width={(loc.size_width || 100) * scaleX}
                height={(loc.size_height || 100) * scaleY}
                fill={resolveColor(LOCATION_TYPE_COLORS[location.location_type] || 'var(--color-chart-1)')}
                opacity={0.5}
              />
              );
            })}
            {/* Viewport indicator */}
            <Rect
              x={viewport.x * scaleX}
              y={viewport.y * scaleY}
              width={viewport.width * scaleX}
              height={viewport.height * scaleY}
              stroke={resolveColor('var(--color-chart-1)')}
              strokeWidth={2}
              fill={resolveColor('var(--color-chart-1)')}
              opacity={0.2}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}