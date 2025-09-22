// Avatar utility functions and constants for animal avatars

export type AnimalType = 
  | 'Kitty' 
  | 'Meerkat' 
  | 'Mouse' 
  | 'Cow' 
  | 'Elephant' 
  | 'Bear' 
  | 'Hamster' 
  | 'Llama' 
  | 'Weasel' 
  | 'Bunny' 
  | 'Koala' 
  | 'Doggy';

export type ColorType = 'Yellow' | 'Blue' | 'Red';

export interface AvatarConfig {
  animal: AnimalType;
  color: ColorType;
}

// Color palette from Figma
export const AVATAR_COLORS = {
  Yellow: {
    background: '#FCDF95',
    animal: '#463B00'
  },
  Blue: {
    background: '#67EAF2',
    animal: '#004246'
  },
  Red: {
    background: '#F47887',
    animal: '#460008'
  }
} as const;

// All available animals
export const AVAILABLE_ANIMALS: AnimalType[] = [
  'Kitty', 'Meerkat', 'Mouse', 'Cow', 'Elephant', 'Bear',
  'Hamster', 'Llama', 'Weasel', 'Bunny', 'Koala', 'Doggy'
];

// All available colors
export const AVAILABLE_COLORS: ColorType[] = ['Yellow', 'Blue', 'Red'];

// Generate all possible combinations
export const ALL_AVATAR_COMBINATIONS: AvatarConfig[] = AVAILABLE_ANIMALS.flatMap(animal =>
  AVAILABLE_COLORS.map(color => ({ animal, color }))
);

// Helper function to get initials from name
export const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Helper function to validate avatar config
export const isValidAvatarConfig = (config: Partial<AvatarConfig>): config is AvatarConfig => {
  return !!(
    config.animal && 
    config.color && 
    AVAILABLE_ANIMALS.includes(config.animal as AnimalType) &&
    AVAILABLE_COLORS.includes(config.color as ColorType)
  );
};

// Helper function to get avatar display name
export const getAvatarDisplayName = (config: AvatarConfig): string => {
  return `${config.animal} (${config.color})`;
};
