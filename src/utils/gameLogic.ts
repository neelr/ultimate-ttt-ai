import {
  BoardState,
  CellValue,
  GameState,
  UltimateBoardState,
} from "../types/game";

// Create an empty 3x3 board
export const createEmptyBoard = (): BoardState => {
  return Array(3)
    .fill(null)
    .map(() => Array(3).fill(null));
};

// Create an empty 3x3 grid of 3x3 boards (Ultimate Tic Tac Toe)
export const createEmptyUltimateBoard = (): UltimateBoardState => {
  return Array(3)
    .fill(null)
    .map(() =>
      Array(3)
        .fill(null)
        .map(() => createEmptyBoard())
    );
};

// Initialize game state
export const initGameState = (): GameState => {
  return {
    boards: createEmptyUltimateBoard(),
    boardStatuses: Array(3)
      .fill(null)
      .map(() => Array(3).fill(null)),
    nextPlayer: "X",
    activeBoardCoords: null, // null means player can choose any board
    winner: null,
    gameStatus: "playing",
    moveHistory: [],
  };
};

// Check if a standard 3x3 board has a winner
export const checkBoardWinner = (board: BoardState): CellValue | "draw" => {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (
      board[i][0] !== null &&
      board[i][0] === board[i][1] &&
      board[i][1] === board[i][2]
    ) {
      return board[i][0];
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (
      board[0][i] !== null &&
      board[0][i] === board[1][i] &&
      board[1][i] === board[2][i]
    ) {
      return board[0][i];
    }
  }

  // Check diagonals
  if (
    board[0][0] !== null &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return board[0][0];
  }

  if (
    board[0][2] !== null &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return board[0][2];
  }

  // Check if board is full (draw)
  const isFull = board.every((row) => row.every((cell) => cell !== null));
  if (isFull) {
    return "draw";
  }

  return null;
};

// Check if the ultimate board has a winner
export const checkUltimateWinner = (
  boardStatuses: (CellValue | "draw")[][]
): CellValue | "draw" => {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (
      boardStatuses[i][0] !== null &&
      boardStatuses[i][0] !== "draw" &&
      boardStatuses[i][0] === boardStatuses[i][1] &&
      boardStatuses[i][1] === boardStatuses[i][2]
    ) {
      return boardStatuses[i][0] as CellValue;
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (
      boardStatuses[0][i] !== null &&
      boardStatuses[0][i] !== "draw" &&
      boardStatuses[0][i] === boardStatuses[1][i] &&
      boardStatuses[1][i] === boardStatuses[2][i]
    ) {
      return boardStatuses[0][i] as CellValue;
    }
  }

  // Check diagonals
  if (
    boardStatuses[0][0] !== null &&
    boardStatuses[0][0] !== "draw" &&
    boardStatuses[0][0] === boardStatuses[1][1] &&
    boardStatuses[1][1] === boardStatuses[2][2]
  ) {
    return boardStatuses[0][0] as CellValue;
  }

  if (
    boardStatuses[0][2] !== null &&
    boardStatuses[0][2] !== "draw" &&
    boardStatuses[0][2] === boardStatuses[1][1] &&
    boardStatuses[1][1] === boardStatuses[2][0]
  ) {
    return boardStatuses[0][2] as CellValue;
  }

  // Check if all boards have a status (draw)
  const isFull = boardStatuses.every((row) =>
    row.every((status) => status !== null)
  );
  if (isFull) {
    return "draw";
  }

  return null;
};

// Make a move in the game
export const makeMove = (
  gameState: GameState,
  boardCoords: [number, number],
  cellCoords: [number, number]
): GameState => {
  const [boardRow, boardCol] = boardCoords;
  const [cellRow, cellCol] = cellCoords;

  // If the game is already won or drawn, don't allow further moves
  if (gameState.gameStatus !== "playing") {
    return gameState;
  }

  // Check if the move is legal (the right board is being played)
  if (
    gameState.activeBoardCoords !== null &&
    (gameState.activeBoardCoords[0] !== boardRow ||
      gameState.activeBoardCoords[1] !== boardCol)
  ) {
    return gameState;
  }

  // Check if the cell is already filled
  if (gameState.boards[boardRow][boardCol][cellRow][cellCol] !== null) {
    return gameState;
  }

  // Check if the board is already won
  if (gameState.boardStatuses[boardRow][boardCol] !== null) {
    return gameState;
  }

  // Clone the game state to avoid mutations
  const newGameState = structuredClone(gameState);

  // Make the move
  newGameState.boards[boardRow][boardCol][cellRow][cellCol] =
    gameState.nextPlayer;

  // Add to move history
  newGameState.moveHistory.push({
    player: gameState.nextPlayer,
    boardCoords: [boardRow, boardCol],
    cellCoords: [cellRow, cellCol],
  });

  // Check if the small board has been won
  const boardStatus = checkBoardWinner(newGameState.boards[boardRow][boardCol]);
  if (boardStatus !== null) {
    newGameState.boardStatuses[boardRow][boardCol] = boardStatus;
  }

  // Check if the game has been won
  const ultimateWinner = checkUltimateWinner(newGameState.boardStatuses);
  if (ultimateWinner !== null) {
    newGameState.winner = ultimateWinner === "draw" ? null : ultimateWinner;
    newGameState.gameStatus = ultimateWinner === "draw" ? "draw" : "won";
  }

  // Switch to the next player
  newGameState.nextPlayer = gameState.nextPlayer === "X" ? "O" : "X";

  // Determine which board is active for the next move
  // The active board is determined by the cell position of the current move
  if (newGameState.boardStatuses[cellRow][cellCol] !== null) {
    // If the board is already won or drawn, player can choose any board
    newGameState.activeBoardCoords = null;
  } else {
    newGameState.activeBoardCoords = [cellRow, cellCol];
  }

  return newGameState;
};
