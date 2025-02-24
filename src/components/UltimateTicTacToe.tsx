'use client';

import { useState, useEffect } from 'react';
import SubBoard from './SubBoard';
import { getClaudeMove, getGPTMove } from '@/utils/aiService';

export type Player = 'X' | 'O';
export type BoardState = (Player | null)[];
export type MainBoardState = (Player | null)[][];

interface AIMessage {
    player: Player;
    message: string;
}

// Game rules summary to prime the AI
const GAME_RULES = `
Ultimate Tic-Tac-Toe Rules:
1. The game consists of 9 smaller tic-tac-toe boards arranged in a 3x3 grid.
2. Each move determines which board the opponent must play in next.
3. When a player wins a small board, they claim that board.
4. If sent to a board that's already won, the player can choose any available board.
5. To win the game, a player must win three small boards in a row.
`;

export default function UltimateTicTacToe() {
    // State for all 9 sub-boards (each containing 9 cells)
    const [boards, setBoards] = useState<MainBoardState>(Array(9).fill(null).map(() => Array(9).fill(null)));

    // State for the main board (tracking won sub-boards)
    const [mainBoard, setMainBoard] = useState<BoardState>(Array(9).fill(null));

    // Current player
    const [currentPlayer, setCurrentPlayer] = useState<Player>('X');

    // Active board (where the next move must be played)
    const [activeBoard, setActiveBoard] = useState<number | null>(null);

    // AI messages
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    // Retry counter for illegal moves
    const [retryCount, setRetryCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Check if a board has been won
    const checkWinner = (board: (Player | null)[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    };

    // Validate if a move is legal
    const isValidMove = (boardIndex: number, cellIndex: number): boolean => {
        // Check if the board is valid
        if (boardIndex < 0 || boardIndex > 8) return false;

        // Check if the cell is valid
        if (cellIndex < 0 || cellIndex > 8) return false;

        // Check if the board is active or if any board can be played
        if (activeBoard !== null && activeBoard !== boardIndex) return false;

        // Check if the board has already been won
        if (mainBoard[boardIndex]) return false;

        // Check if the cell is already filled
        if (boards[boardIndex][cellIndex]) return false;

        return true;
    };

    // Check for main game winner
    const gameWinner = checkWinner(mainBoard);

    // Handle a move in a sub-board
    const handleMove = (boardIndex: number, cellIndex: number) => {
        // Only allow moves from the AI, not from human interaction
        if (!isValidMove(boardIndex, cellIndex)) {
            setErrorMessage(`Invalid move: board ${boardIndex}, cell ${cellIndex}`);
            return false;
        }

        // Clear error message if move is valid
        setErrorMessage(null);

        // Make the move
        const newBoards = [...boards];
        newBoards[boardIndex] = [...boards[boardIndex]];
        newBoards[boardIndex][cellIndex] = currentPlayer;
        setBoards(newBoards);

        // Check if the sub-board was won
        const subBoardWinner = checkWinner(newBoards[boardIndex]);
        if (subBoardWinner) {
            const newMainBoard = [...mainBoard];
            newMainBoard[boardIndex] = subBoardWinner;
            setMainBoard(newMainBoard);
        }

        // Set the next active board
        setActiveBoard(mainBoard[cellIndex] ? null : cellIndex);

        // Switch players
        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
        setRetryCount(0); // Reset retry counter after successful move

        return true;
    };

    // AI move handler
    useEffect(() => {
        const makeAIMove = async () => {
            if (gameWinner || isThinking) return;

            setIsThinking(true);
            try {
                const aiResponse = await (currentPlayer === 'X'
                    ? getClaudeMove(boards, mainBoard, activeBoard, GAME_RULES)
                    : getGPTMove(boards, mainBoard, activeBoard, GAME_RULES));

                // Try to make the move
                const moveResult = handleMove(aiResponse.move.boardIndex, aiResponse.move.cellIndex);

                // If move was successful, add the message
                if (moveResult) {
                    setMessages(prev => [...prev, {
                        player: currentPlayer,
                        message: aiResponse.message
                    }]);
                } else {
                    // If move was invalid and retry count is less than 3, try again
                    if (retryCount < 3) {
                        setRetryCount(prev => prev + 1);
                        // Don't switch players, but set isThinking to false to trigger another attempt
                        setIsThinking(false);
                    } else {
                        // If retry limit reached, make a message about the failed move
                        setMessages(prev => [...prev, {
                            player: currentPlayer,
                            message: `Failed to make a valid move after several attempts. Making a random valid move instead.`
                        }]);

                        // Find a random valid move
                        const validMoves: { boardIndex: number, cellIndex: number }[] = [];
                        for (let b = 0; b < 9; b++) {
                            if (activeBoard !== null && activeBoard !== b) continue;
                            if (mainBoard[b]) continue;

                            for (let c = 0; c < 9; c++) {
                                if (!boards[b][c]) {
                                    validMoves.push({ boardIndex: b, cellIndex: c });
                                }
                            }
                        }

                        if (validMoves.length > 0) {
                            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                            handleMove(randomMove.boardIndex, randomMove.cellIndex);
                        }

                        setRetryCount(0);
                    }
                }
            } catch (error) {
                console.error('AI move error:', error);
                // Make a random move if AI fails
                setRetryCount(prev => prev + 1);
                setIsThinking(false);
            } finally {
                // Only set thinking to false if we've made a successful move or hit retry limit
                if (!errorMessage || retryCount >= 3) {
                    setIsThinking(false);
                }
            }
        };

        // Trigger AI move
        makeAIMove();
    }, [currentPlayer, gameWinner, boards, mainBoard, activeBoard, isThinking, retryCount, errorMessage]);

    return (
        <div className="flex flex-row h-screen bg-black text-white">
            {/* Fixed Sidebar */}
            <div className="w-80 border-r border-white/10 flex flex-col h-full">
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-medium tracking-tight">Ultimate Tic-Tac-Toe</h1>
                    <p className="text-sm text-white/60 mt-1">Claude vs GPT</p>
                </div>

                {/* AI Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="text-center py-8 text-white/40 text-sm">
                            Game messages will appear here...
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`rounded-lg p-4 ${msg.player === 'X'
                                ? 'bg-blue-950/30 border-l-2 border-blue-500/70'
                                : 'bg-red-950/30 border-l-2 border-red-500/70'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${msg.player === 'X' ? 'bg-blue-500' : 'bg-red-500'
                                    }`} />
                                <span className="font-medium text-sm">
                                    {msg.player === 'X' ? 'Claude' : 'GPT'}
                                </span>
                            </div>
                            <p className="text-sm text-white/80">{msg.message}</p>
                        </div>
                    ))}
                </div>

                {/* Game Status */}
                <div className="p-4 border-t border-white/10">
                    {isThinking ? (
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="relative w-4 h-4">
                                <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                            </div>
                            <span className="text-sm">
                                {currentPlayer === 'X' ? 'Claude' : 'GPT'} is thinking...
                                {retryCount > 0 && ` (Retry attempt ${retryCount})`}
                            </span>
                        </div>
                    ) : gameWinner ? (
                        <div className="font-medium">
                            {gameWinner === 'X' ? 'Claude' : 'GPT'} wins the game! 🎉
                        </div>
                    ) : (
                        <div className="text-sm flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${currentPlayer === 'X' ? 'bg-blue-500' : 'bg-red-500'
                                }`} />
                            Current turn: {currentPlayer === 'X' ? 'Claude' : 'GPT'}
                            {errorMessage && (
                                <div className="text-red-400 text-xs mt-1">{errorMessage}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                    <div className="grid grid-cols-3 gap-2">
                        {boards.map((board, boardIndex) => (
                            <div
                                key={boardIndex}
                                className={`relative rounded ${activeBoard === null || activeBoard === boardIndex
                                    ? 'ring-1 ring-white/20'
                                    : 'opacity-60'
                                    }`}
                            >
                                {mainBoard[boardIndex] ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded z-10">
                                        <span className={`text-5xl font-bold ${mainBoard[boardIndex] === 'X'
                                            ? 'text-blue-500'
                                            : 'text-red-500'
                                            }`}>
                                            {mainBoard[boardIndex]}
                                        </span>
                                    </div>
                                ) : null}
                                <SubBoard
                                    board={board}
                                    onMove={() => {/* Disable human moves by making this a no-op */ }}
                                    isActive={false} // Force isActive to false to prevent hover styles
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 