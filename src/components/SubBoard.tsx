'use client';

import { type Player } from './UltimateTicTacToe';

interface SubBoardProps {
    board: (Player | null)[];
    // These parameters are kept in the interface for compatibility
    // with the parent component, but are not used in this implementation
    onMove: (index: number) => void;
    isActive: boolean;
}

export default function SubBoard({ board }: SubBoardProps) {
    return (
        <div className="grid grid-cols-3 gap-px bg-white/5 p-1 rounded transition-colors">
            {board.map((cell, index) => (
                <div
                    key={index}
                    className={`
                        w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-medium
                        rounded transition-all duration-150
                        ${cell ? 'bg-white/10' : 'bg-white/5'}
                    `}
                    aria-label={`Cell ${index}`}
                >
                    {cell && (
                        <span
                            className={`
                                ${cell === 'X' ? 'text-blue-400' : 'text-red-400'}
                                transform transition-transform duration-150
                            `}
                        >
                            {cell}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
} 