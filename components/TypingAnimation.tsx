'use client';

import { useState, useEffect } from 'react';

const words = ['Apprendre.', 'Progresser.', 'Grandir.'];

export default function TypingAnimation() {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);

    // typeWriter
    useEffect(() => {
        if (index === words.length) return;

        if (subIndex === words[index].length + 1 && !reverse) {
            const timeout = setTimeout(() => {
                setReverse(true);
            }, 2000);
            return () => clearTimeout(timeout);
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % words.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, Math.max(reverse ? 50 : 100, Math.random() * 50));

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse]);

    return (
        <span className="text-primary/20 dark:text-white/20">
            {words[index].substring(0, subIndex)}
            <span className="animate-pulse">|</span>
        </span>
    );
}
