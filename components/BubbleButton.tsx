"use client";

import { useState, useRef, MouseEvent } from "react";

interface BubbleButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: "default" | "rounded";
    disabled?: boolean;
}

export default function BubbleButton({ children, onClick, className = "", variant = "default", disabled = false }: BubbleButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current || disabled) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setBubblePosition({ x, y });
    };

    const handleMouseEnter = () => {
        if (!disabled) setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const baseClasses = variant === "rounded"
        ? "w-full h-14 bg-primary text-white dark:bg-white dark:text-black rounded-full font-bold text-lg shadow-xl shadow-primary/10 active:scale-95 transition-transform duration-100"
        : "w-full bg-primary text-white dark:bg-white dark:text-black h-12 rounded-none font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform duration-100";

    const disabledClasses = "opacity-50 cursor-not-allowed active:scale-100";

    return (
        <button
            ref={buttonRef}
            onClick={onClick}
            disabled={disabled}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`${baseClasses} ${disabled ? disabledClasses : ""} ${className} relative overflow-hidden`}
        >
            {/* Cursor-following glowing orb */}
            {isHovered && !disabled && (
                <span
                    className="absolute w-12 h-12 rounded-full pointer-events-none"
                    style={{
                        left: `${bubblePosition.x}px`,
                        top: `${bubblePosition.y}px`,
                        transform: 'translate(-50%, -50%)',
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 40%, rgba(255, 255, 255, 0.4) 70%, transparent 100%)',
                        boxShadow: `
              0 0 20px 8px rgba(255, 255, 255, 0.9),
              0 0 40px 15px rgba(255, 255, 255, 0.7),
              0 0 60px 25px rgba(255, 255, 255, 0.5),
              0 0 80px 35px rgba(255, 255, 255, 0.3)
            `,
                        transition: 'left 0.08s ease-out, top 0.08s ease-out',
                    }}
                />
            )}

            {/* Button content */}
            <span className="relative z-10">{children}</span>
        </button>
    );
}
