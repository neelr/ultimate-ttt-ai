export type CellValue = "X" | "O" | null;
export type BoardState = CellValue[][];
export type UltimateBoardState = BoardState[][];

export type GameStatus = "playing" | "won" | "draw";

export interface GameState {
  boards: UltimateBoardState;
  boardStatuses: (CellValue | "draw")[][]; // Status of each small board
  nextPlayer: "X" | "O";
  activeBoardCoords: [number, number] | null; // Row and column of the active board
  winner: CellValue;
  gameStatus: GameStatus;
  moveHistory: Move[];
}

export interface Move {
  player: "X" | "O";
  boardCoords: [number, number]; // Coordinates of the small board
  cellCoords: [number, number]; // Coordinates of the cell within the small board
}
