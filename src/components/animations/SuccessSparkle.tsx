import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { designTokens } from '@/constants/designTokens';

interface SuccessSparkleProps {
  size: number;
  rotation?: number;
}

/**
 * Animated triangle sparkle component for success state
 * Uses SVG polygon to create triangular shape with glow effect
 * Colors match success design tokens
 */
export default function SuccessSparkle({
  size,
  rotation = 0
}: SuccessSparkleProps) {
  const successColors = [
    '#10B981', // Emerald-500 - main success color
    '#22C55E', // Green-500 - vibrant green
    '#34D399', // Emerald-400 - lighter green
    '#16A34A', // Green-600 - darker green
  ];

  const color = successColors[Math.floor(Math.random() * successColors.length)];
  const svgSize = size * 12; // Base size multiplier like original

  // Create triangle points for upward-pointing triangle, centered in SVG
  const triangleSize = svgSize * 0.7; // Make triangle smaller to fit centered
  const halfTriangle = triangleSize / 2;
  const triangleHeight = triangleSize * 0.866; // Equilateral triangle height
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  // Center the triangle in the viewBox
  const points = `${centerX},${centerY - triangleHeight/2} ${centerX - halfTriangle},${centerY + triangleHeight/2} ${centerX + halfTriangle},${centerY + triangleHeight/2}`;

  return (
    <View
      style={{
        width: svgSize,
        height: svgSize,
        transform: [{ rotate: `${rotation}deg` }],
        position: 'absolute',
        left: (12 - svgSize) / 2, // Center in 12x12 container
        top: (12 - svgSize) / 2,
      }}
    >
      {/* Main triangle */}
      <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <Polygon
          points={points}
          fill={color}
        />
      </Svg>

      {/* Glow effect triangle (slightly offset and blurred) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.6,
        }}
      >
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <Polygon
            points={points}
            fill={color}
            opacity={0.5}
          />
        </Svg>
      </View>
    </View>
  );
}