import { defineStore } from 'pinia';
import type { CreationData, GamePhase, GameState } from '../models/GameState';
import { coerceGameState, GamePhase as GamePhaseEnum } from '../models/GameState';

export const useGameStore = defineStore('game', {
  state: (): GameState => coerceGameState({}),
  getters: {
    currentPhase: (state): GamePhase => state.phase || GamePhaseEnum.INITIAL,
    isInitial: (state): boolean => (state.phase || GamePhaseEnum.INITIAL) === GamePhaseEnum.INITIAL,
    isCreation: (state): boolean => (state.phase || GamePhaseEnum.INITIAL) === GamePhaseEnum.CREATION,
    isPlaying: (state): boolean => (state.phase || GamePhaseEnum.INITIAL) === GamePhaseEnum.PLAYING,
  },
  actions: {
    setPlayer(name: string) {
      this.player = { name } as any;
    },
    start(saveName?: string) {
      this.started = true;
      this.saveName = saveName;
      this.phase = GamePhaseEnum.PLAYING;
    },
    reset() {
      const next = coerceGameState({});
      Object.assign(this, next);
    },
    setPhase(phase: GamePhase) {
      this.phase = phase;
      if (phase === GamePhaseEnum.PLAYING) {
        this.started = true;
      } else {
        this.started = false;
        if (phase === GamePhaseEnum.INITIAL) {
          this.saveName = undefined;
          this.lastLoaded = undefined;
          this.creationData = undefined;
        }
      }
    },
    setCreationData(creationData: CreationData) {
      this.creationData = creationData;
    },
    updateCreationData(updates: Partial<CreationData>) {
      if (this.creationData) {
        this.creationData = { ...this.creationData, ...updates };
      } else {
        this.creationData = updates as CreationData;
      }
    },
  },
});
