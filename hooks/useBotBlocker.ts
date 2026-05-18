import { useState, useEffect } from 'react';

const BLOCK_DURATIONS = [3600, 10800, 86400]; // 1h, 3h, 24h en secondes

export function useBotBlocker() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const storedBlockStr = localStorage.getItem('bot_block_data');
    if (storedBlockStr) {
      try {
        const blockData = JSON.parse(storedBlockStr);
        const now = Date.now();
        const diffSeconds = Math.floor((blockData.expiresAt - now) / 1000);

        if (diffSeconds > 0) {
          setIsBlocked(true);
          setTimeLeft(diffSeconds);
          setShowPopup(true);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!isBlocked || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsBlocked(false);
          setShowPopup(false);
          clearInterval(interval);
          // Actualiser la page après expiration comme demandé
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBlocked, timeLeft]);

  const handleBotDetected = () => {
    let offenseCount = 0;
    const storedBlockStr = localStorage.getItem('bot_block_data');
    if (storedBlockStr) {
      try {
        const blockData = JSON.parse(storedBlockStr);
        offenseCount = blockData.offenseCount || 0;
        // Check if the previous block expired. If it expired a long time ago, maybe reset?
        // Let's just always increment offense count.
      } catch (e) {}
    }

    const nextOffenseCount = Math.min(offenseCount + 1, BLOCK_DURATIONS.length);
    const durationSeconds = BLOCK_DURATIONS[nextOffenseCount - 1];
    
    const newBlockData = {
      offenseCount: nextOffenseCount,
      expiresAt: Date.now() + durationSeconds * 1000,
    };

    localStorage.setItem('bot_block_data', JSON.stringify(newBlockData));
    
    setIsBlocked(true);
    setTimeLeft(durationSeconds);
    setShowPopup(true);
  };

  const closePopup = () => setShowPopup(false);

  return { isBlocked, timeLeft, showPopup, handleBotDetected, closePopup };
}
