import { CellValue } from "@/types/game";
import { motion } from "framer-motion";

interface CellProps {
    value: CellValue;
    onClick: () => void;
    isActive: boolean;
    isHighlighted: boolean;
}

export function Cell({ value, onClick, isActive, isHighlighted }: CellProps) {
    // Style classes based on cell state
    const cellBaseClasses = "w-full h-full flex items-center justify-center text-xl font-bold border transition-all duration-300";
    const activeClasses = isActive ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : "cursor-not-allowed opacity-80";
    const highlightClasses = isHighlighted ? "bg-blue-50 dark:bg-blue-900/30" : "";

    // Animation variants
    const variants = {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
    };

    return (
        <button
            className={`${cellBaseClasses} ${activeClasses} ${highlightClasses}`}
            onClick={onClick}
            disabled={!isActive}
            aria-label={value ? `Cell with ${value}` : "Empty cell"}
        >
            {value && (
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={variants}
                    className={`${value === "X" ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                    {value}
                </motion.div>
            )}
        </button>
    );
} 