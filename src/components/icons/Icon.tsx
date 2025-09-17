import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';

// Import original components as fallbacks
import CustomCheckmarkIcon from '../CustomCheckmarkIcon';
import CustomXIcon from '../CustomXIcon';
import CustomSkipIcon from '../CustomSkipIcon';
import CustomCircleDashIcon from '../CustomCircleDashIcon';
import { SpaciousViewIcon as OriginalSpaciousViewIcon, CompactViewIcon as OriginalCompactViewIcon } from '../ViewModeIcons';

// Define all available icon names
export type IconName = 
  // Navigation
  | 'home' | 'social' | 'profile' | 'settings' | 'analytics'
  // Actions  
  | 'camera' | 'export' | 'friends' | 'stats' | 'trophy'
  // Interface
  | 'heart' | 'search' | 'spacious-view' | 'compact-view'
  // Status
  | 'completed' | 'failed' | 'skipped' | 'circle-dash'
  // Activity Status
  | 'fire' | 'add' | 'activity-completed' | 'activity-failed';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
  // Additional props for specific icons
  strokeWidth?: number; // For status icons
  isActive?: boolean;   // For view mode icons
}

// SVG Icon Components - using your actual SVG files
const SVGIcons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  // Navigation icons - from your actual SVG files
  home: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12,14a3,3,0,0,0-3,3v7.026h6V17A3,3,0,0,0,12,14Z"/>
      <Path d="M13.338.833a2,2,0,0,0-2.676,0L0,10.429v10.4a3.2,3.2,0,0,0,3.2,3.2H7V17a5,5,0,0,1,10,0v7.026h3.8a3.2,3.2,0,0,0,3.2-3.2v-10.4Z"/>
    </Svg>
  ),
  
  social: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m7.5 13a4.5 4.5 0 1 1 4.5-4.5 4.505 4.505 0 0 1 -4.5 4.5zm6.5 11h-13a1 1 0 0 1 -1-1v-.5a7.5 7.5 0 0 1 15 0v.5a1 1 0 0 1 -1 1zm3.5-15a4.5 4.5 0 1 1 4.5-4.5 4.505 4.505 0 0 1 -4.5 4.5zm-1.421 2.021a6.825 6.825 0 0 0 -4.67 2.831 9.537 9.537 0 0 1 4.914 5.148h6.677a1 1 0 0 0 1-1v-.038a7.008 7.008 0 0 0 -7.921-6.941z"/>
    </Svg>
  ),
  
  profile: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
      <Circle cx="256" cy="128" r="128"/>
      <Path d="M256,298.667c-105.99,0.118-191.882,86.01-192,192C64,502.449,73.551,512,85.333,512h341.333   c11.782,0,21.333-9.551,21.333-21.333C447.882,384.677,361.99,298.784,256,298.667z"/>
    </Svg>
  ),
  
  settings: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
      <Path d="M228.267,56c-17.455-37.114-61.692-53.05-98.805-35.595C113.814,27.765,101.226,40.353,93.867,56H32   C14.327,56,0,70.327,0,88l0,0c0,17.673,14.327,32,32,32h61.76c17.455,37.114,61.692,53.05,98.805,35.595   c15.647-7.359,28.235-19.948,35.595-35.595H480c17.673,0,32-14.327,32-32l0,0c0-17.673-14.327-32-32-32H228.267z"/>
      <Path d="M351.04,181.333c-28.765,0.051-54.931,16.659-67.221,42.667H32c-17.673,0-32,14.327-32,32l0,0c0,17.673,14.327,32,32,32   h251.733c17.455,37.114,61.692,53.05,98.805,35.595c15.647-7.359,28.235-19.948,35.595-35.595H480c17.673,0,32-14.327,32-32l0,0   c0-17.673-14.327-32-32-32h-61.76C405.953,197.999,379.798,181.393,351.04,181.333z"/>
      <Path d="M160.96,349.333c-28.758,0.059-54.913,16.666-67.2,42.667H32c-17.673,0-32,14.327-32,32l0,0c0,17.673,14.327,32,32,32   h61.76c17.455,37.114,61.692,53.05,98.805,35.595c15.647-7.359,28.235-19.948,35.595-35.595H480c17.673,0,32-14.327,32-32l0,0   c0-17.673-14.327-32-32-32H228.267C215.963,365.965,189.756,349.352,160.96,349.333z"/>
    </Svg>
  ),
  
  analytics: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19,1H5C2.239,1,0,3.239,0,6V14c0,2.761,2.239,5,5,5h6v2H7c-.553,0-1,.448-1,1s.447,1,1,1h10c.553,0,1-.448,1-1s-.447-1-1-1h-4v-2h6c2.761,0,5-2.239,5-5V6c0-2.761-2.239-5-5-5ZM6.802,15.359c-1.909-.449-3.404-2.058-3.729-3.992-.469-2.791,1.377-5.249,3.927-5.767v4.485c0,.53,.211,1.039,.586,1.414l3.169,3.169c-1.093,.724-2.482,1.036-3.952,.691Zm5.367-2.105l-2.875-2.875c-.188-.188-.293-.442-.293-.707V5.601c2.282,.463,4,2.48,4,4.899,0,1.019-.308,1.964-.832,2.754Zm7.832,1.746h-3c-.552,0-1-.448-1-1s.448-1,1-1h3c.552,0,1,.448,1,1s-.448,1-1,1Zm0-4h-3c-.552,0-1-.448-1-1s.448-1,1-1h3c.552,0,1,.448,1,1s-.448,1-1,1Zm0-4h-3c-.552,0-1-.448-1-1s.448-1,1-1h3c.552,0,1,.448,1,1s-.448,1-1,1Z"/>
    </Svg>
  ),
  
  // Action icons - from your actual SVG files
  camera: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.721,3,16.308,1.168A3.023,3.023,0,0,0,13.932,0H10.068A3.023,3.023,0,0,0,7.692,1.168L6.279,3Z"/>
      <Circle cx="12" cy="14" r="4"/>
      <Path d="M19,5H5a5.006,5.006,0,0,0-5,5v9a5.006,5.006,0,0,0,5,5H19a5.006,5.006,0,0,0,5-5V10A5.006,5.006,0,0,0,19,5ZM12,20a6,6,0,1,1,6-6A6.006,6.006,0,0,1,12,20Z"/>
    </Svg>
  ),
  
  stats: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12,6A3,3,0,0,0,9,9V21a3,3,0,0,0,6,0V9A3,3,0,0,0,12,6Z"/>
      <Path d="M21,0a3,3,0,0,0-3,3V21a3,3,0,0,0,6,0V3A3,3,0,0,0,21,0Zm1,21a1,1,0,0,1-2,0V3a1,1,0,0,1,2,0Z"/>
      <Path d="M3,12a3,3,0,0,0-3,3v6a3,3,0,0,0,6,0V15A3,3,0,0,0,3,12Z"/>
    </Svg>
  ),
  
  export: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.8,21.21c.42,.72,.17,1.63-.55,2.05-.83,.48-1.78,.74-2.75,.74H5.5c-3.03,0-5.5-2.47-5.5-5.5V5.5C0,2.47,2.47,0,5.5,0h6.34c1.45,0,2.87,.59,3.89,1.61l2.66,2.66c.82,.82,1.35,1.85,1.54,2.99,.14,.82-.42,1.61-1.23,1.75-.06,.01-5.69,0-5.69,0-1.1,0-2-.9-2-2V3H5.5c-1.38,0-2.5,1.12-2.5,2.5v13c0,1.38,1.12,2.5,2.5,2.5H14.5c.44,0,.87-.12,1.25-.33,.71-.41,1.63-.17,2.05,.55Zm5.91-6.42l-3-3.16c-.63-.63-1.71-.18-1.71,.71v1.66h-5.5c-.83,0-1.5,.67-1.5,1.5s.67,1.5,1.5,1.5h5.5v1.66c0,.89,1.08,1.34,1.71,.71l3-3.16c.39-.39,.39-1.02,0-1.41Z"/>
    </Svg>
  ),
  
  friends: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 512.047 512.047" fill={color}>
      <Circle cx="192" cy="128.024" r="128"/>
      <Path d="M192,298.69C86.015,298.82,0.129,384.705,0,490.69c0,11.782,9.551,21.333,21.333,21.333h341.333   c11.782,0,21.333-9.551,21.333-21.333C383.871,384.705,297.985,298.82,192,298.69z"/>
      <Path d="M469.333,168.024c-24.717,1.231-43.79,22.211-42.667,46.933c1.123-24.722-17.949-45.702-42.667-46.933   c-24.717,1.231-43.79,22.211-42.667,46.933c0,36.907,48.128,80.149,72.107,99.392c7.731,6.19,18.722,6.19,26.453,0   c23.979-19.2,72.107-62.485,72.107-99.392C513.123,190.234,494.051,169.255,469.333,168.024z"/>
    </Svg>
  ),
  
  trophy: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m14.059 16h.941c6.643 0 9-3.5 9-6.5a3.5 3.5 0 0 0 -2.913-3.441 11.564 11.564 0 0 0 .854-2.466 2.961 2.961 0 0 0 -.613-2.476 3.022 3.022 0 0 0 -2.351-1.117h-13.954a3.022 3.022 0 0 0 -2.351 1.117 2.961 2.961 0 0 0 -.613 2.476 11.688 11.688 0 0 0 .852 2.467 3.5 3.5 0 0 0 -2.911 3.44c0 3 2.357 6.5 9 6.5h.933a4.5 4.5 0 0 1 .067.637v3.363a1.883 1.883 0 0 1 -2 2h-3v2h14v-2h-3a1.885 1.885 0 0 1 -2.008-2v-3.363a4.646 4.646 0 0 1 .067-.637zm1.418-2.651a21.035 21.035 0 0 0 4.556-5.349h.467a1.5 1.5 0 0 1 1.5 1.5c0 2.176-1.992 4.5-7.153 4.5a3.6 3.6 0 0 1 .63-.651zm-13.477-3.849a1.5 1.5 0 0 1 1.5-1.5h.464a20.978 20.978 0 0 0 4.551 5.349 3.668 3.668 0 0 1 .63.651c-5.161 0-7.145-2.324-7.145-4.5z"/>
    </Svg>
  ),
  
  // Interface icons - from your actual SVG files
  heart: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.5.917a6.4,6.4,0,0,0-5.5,3.3A6.4,6.4,0,0,0,6.5.917,6.8,6.8,0,0,0,0,7.967c0,6.775,10.956,14.6,11.422,14.932l.578.409.578-.409C13.044,22.569,24,14.742,24,7.967A6.8,6.8,0,0,0,17.5.917Z"/>
    </Svg>
  ),
  
  search: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 513.749 513.749" fill={color}>
      <Path d="M504.352,459.061l-99.435-99.477c74.402-99.427,54.115-240.344-45.312-314.746S119.261-9.277,44.859,90.15   S-9.256,330.494,90.171,404.896c79.868,59.766,189.565,59.766,269.434,0l99.477,99.477c12.501,12.501,32.769,12.501,45.269,0   c12.501-12.501,12.501-32.769,0-45.269L504.352,459.061z M225.717,385.696c-88.366,0-160-71.634-160-160s71.634-160,160-160   s160,71.634,160,160C385.623,314.022,314.044,385.602,225.717,385.696z"/>
    </Svg>
  ),
  
  // Activity Status icons - from your actual SVG files
  fire: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m18.593 7.763c-1.392-1.375-2.593-2.562-2.593-5.763 0-.284-.121-.554-.331-.744-.211-.189-.493-.278-.774-.251-2.385.253-6.895 2.041-6.895 6.995 0 .199.121 3.685-.488 4.315-.088.091-.218.185-.512.185-.182 0-.301-.052-.422-.187-.589-.649-.695-2.56-.583-3.709.025-.257-.05-.503-.195-.697-.062-.083-.138-.158-.227-.22-.352-.246-.817-.239-1.16.008-.146.106-.266.252-.34.429l-.179.431c-.622 1.482-1.395 3.328-1.394 4.945.003 5.948 3.554 9.5 9.5 9.5 6.126 0 9.5-3.196 9.5-9 0-3.367-1.544-4.892-2.907-6.237z"/>
    </Svg>
  ),
  
  add: ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m12 0a12 12 0 1 0 12 12 12.013 12.013 0 0 0 -12-12zm4 13h-3v3a1 1 0 0 1 -2 0v-3h-3a1 1 0 0 1 0-2h3v-3a1 1 0 0 1 2 0v3h3a1 1 0 0 1 0 2z"/>
    </Svg>
  ),
  
  'activity-completed': ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm-.091,15.419c-.387.387-.896.58-1.407.58s-1.025-.195-1.416-.585l-2.782-2.696,1.393-1.437,2.793,2.707,5.809-5.701,1.404,1.425-5.793,5.707Z"/>
    </Svg>
  ),
  
  'activity-failed': ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
      <Path d="M256,0C114.615,0,0,114.615,0,256s114.615,256,256,256s256-114.615,256-256C511.847,114.678,397.322,0.153,256,0z    M341.333,311.189c8.669,7.979,9.229,21.475,1.25,30.144c-7.979,8.669-21.475,9.229-30.144,1.25c-0.434-0.399-0.85-0.816-1.25-1.25   L256,286.165l-55.168,55.168c-8.475,8.185-21.98,7.95-30.165-0.525c-7.984-8.267-7.984-21.373,0-29.64L225.835,256l-55.168-55.168   c-8.185-8.475-7.95-21.98,0.525-30.165c8.267-7.984,21.373-7.984,29.64,0L256,225.835l55.189-55.168   c7.979-8.669,21.475-9.229,30.144-1.25c8.669,7.979,9.229,21.475,1.25,30.144c-0.399,0.434-0.816,0.85-1.25,1.25L286.165,256   L341.333,311.189z"/>
    </Svg>
  ),
};

// Fallback to original components for status icons (more customizable)
const originalComponents: Partial<Record<IconName, React.ComponentType<any>>> = {
  completed: CustomCheckmarkIcon,
  failed: CustomXIcon,
  skipped: CustomSkipIcon,
  'circle-dash': CustomCircleDashIcon,
  'spacious-view': OriginalSpaciousViewIcon,
  'compact-view': OriginalCompactViewIcon,
};

export default function Icon({ 
  name, 
  size = 20, 
  color = 'currentColor', 
  style,
  strokeWidth,
  isActive,
  ...props 
}: IconProps) {
  // For status icons and view mode icons, use original components for better customization
  if (name in originalComponents && (strokeWidth !== undefined || isActive !== undefined)) {
    const OriginalComponent = originalComponents[name]!;
    
    if (name === 'completed' || name === 'failed' || name === 'skipped' || name === 'circle-dash') {
      return (
        <View style={style}>
          <OriginalComponent 
            size={size} 
            color={color} 
            strokeWidth={strokeWidth}
            {...props}
          />
        </View>
      );
    }
    
    if (name === 'spacious-view' || name === 'compact-view') {
      return (
        <View style={style}>
          <OriginalComponent 
            size={size} 
            color={color} 
            isActive={isActive}
            {...props}
          />
        </View>
      );
    }
  }
  
  // Use inline SVG components for simple icons
  const SVGIconComponent = SVGIcons[name];
  
  if (!SVGIconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <View style={[{ width: size, height: size }, style]}>
      <SVGIconComponent size={size} color={color} />
    </View>
  );
}
