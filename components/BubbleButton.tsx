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
    const [shimmerX, setShimmerX] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current || disabled) return;
        if (typeof window !== "undefined" && !window.matchMedia('(hover: hover)').matches) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setBubblePosition({ x, y });
        setShimmerX((x / rect.width) * 100);
    };

    const handleMouseEnter = () => {
        if (typeof window !== "undefined" && window.matchMedia('(hover: hover)').matches) {
            if (!disabled) setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const baseClasses = variant === "rounded"
        ? "w-full min-h-[3.5rem] flex items-center justify-center bg-primary text-white dark:bg-white dark:text-black rounded-full font-bold text-lg shadow-xl active:scale-95 transition-all duration-200"
        : "w-full min-h-[3rem] flex items-center justify-center bg-primary text-white dark:bg-white dark:text-black rounded-none font-bold text-sm uppercase tracking-widest active:scale-95 transition-all duration-200";

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
            style={{
                boxShadow: isHovered && !disabled
                    ? '0 0 20px 4px rgba(242,140,40,0.5), 0 0 45px 10px rgba(255,200,60,0.25), 0 4px 20px rgba(0,0,0,0.4)'
                    : '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'box-shadow 0.3s ease',
            }}
        >
            {/* Shimmer sweep layer */}
            {isHovered && !disabled && (
                <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `linear-gradient(105deg, transparent ${shimmerX - 20}%, rgba(255,235,130,0.18) ${shimmerX}%, rgba(255,255,200,0.32) ${shimmerX + 5}%, rgba(255,235,130,0.18) ${shimmerX + 10}%, transparent ${shimmerX + 30}%)`,
                        transition: 'background 0.05s ease-out',
                    }}
                />
            )}

            {/* Golden orb that follows cursor */}
            {isHovered && !disabled && (
                <span
                    className="absolute pointer-events-none"
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        left: `${bubblePosition.x}px`,
                        top: `${bubblePosition.y}px`,
                        transform: 'translate(-50%, -50%)',
                        background: 'radial-gradient(circle, rgba(255,230,100,0.95) 0%, rgba(242,140,40,0.75) 40%, rgba(200,90,0,0.3) 70%, transparent 100%)',
                        boxShadow: `
                            0 0 15px 6px  rgba(255,220,80,0.9),
                            0 0 35px 14px rgba(242,140,40,0.6),
                            0 0 60px 25px rgba(200,90,0,0.3)
                        `,
                        transition: 'left 0.06s ease-out, top 0.06s ease-out',
                    }}
                />
            )}

            {/* Button content */}
            <span className="relative z-10 w-full flex items-center justify-center">{children}</span>
        </button>
    );
}
