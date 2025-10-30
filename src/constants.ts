export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export const GAMEMODE = {
  SURVIVAL: 'survival',
  CREATIVE: 'creative',
  ADVENTURE: 'adventure',
  SPECTATOR: 'spectator',
} as const;

// Currently, only Paper is supported
export const SERVER_TYPE = {
  PAPER: 'paper',
} as const;
