
export type Language = 'ar' | 'en';

export enum GamePhase {
  ENTRY = 'ENTRY',
  LOBBY = 'LOBBY',
  ROLE_REVEAL = 'ROLE_REVEAL',
  DISCUSSION = 'DISCUSSION',
  VOTING = 'VOTING',
  RESULTS = 'RESULTS',
  ADMIN = 'ADMIN' 
}

export interface Category {
  id: string;
  ar: string;
  en: string;
}

export interface WordPair {
  id: string;
  categoryId: string;
  secret: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isImposter: boolean;
  isJudge: boolean;
  score: number;
  hasVoted: boolean;
  voteId?: string;
  word?: string;
  location?: string;
}

export interface Room {
  code: string;
  categories: string[];
  impostersCount: number;
  roundDuration: number; 
  timerEndsAt?: number;
  wordSource: 'SYSTEM' | 'JUDGE';
  timeMode: 'OPEN' | 'TIMED';
  phase: GamePhase;
  players: Player[];
  secretWord: string;
  currentCategoryName?: string;
  winner?: 'PLAYERS' | 'IMPOSTERS';
  lastActivity: number;
}

export interface TranslationSet {
  title: string;
  createRoom: string;
  joinRoom: string;
  enterName: string;
  roomCode: string;
  start: string;
  category: string;
  imposters: string;
  wordSource: string;
  playersCount: string;
  discussion: string;
  voteNow: string;
  results: string;
  points: string;
  imposter: string;
  detective: string;
  judge: string;
  yourWord: string;
  system: string;
  manual: string;
  open: string;
  timed: string;
  readyToVote: string;
  guessWord: string;
  winner: string;
  backToLobby: string;
  adminDashboard: string;
  roomSettings: string;
  timeLimit: string;
  minutes: string;
  shareWithFriends: string;
  suggestionsBox: string;
  gameGuide: string;
  howToPlay: string;
  rule1: string;
  rule2: string;
  rule3: string;
  close: string;
  imposterAlert: string;
  categoryInput: string;
}
