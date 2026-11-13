// augments files core pulls in - one directly, one through inCore.ts - and needs no import of its
// own for either
export interface Marker { augmented?: true }

declare module './inCore' {
  interface Extensible { added?: number }
}

declare module './deep' {
  interface Deep { added?: number }
}
