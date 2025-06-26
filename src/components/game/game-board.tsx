
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Game Constants
const GAME_WIDTH = 500;
const GAME_HEIGHT = 400;
const PLAYER_SIZE = 20;
const ENEMY_SIZE = 20;
const COLLECTIBLE_SIZE = 15;
const PLAYER_SPEED = 3;
const ENEMY_SPEED = 1.5;
const ENEMY_DIRECTION_CHANGE_INTERVAL = 120; // in frames

type Position = {
  x: number;
  y: number;
};

// Helper function for collision detection
const checkCollision = (rect1: Position & { size: number }, rect2: Position & { size: number }) => {
  return (
    rect1.x < rect2.x + rect2.size &&
    rect1.x + rect1.size > rect2.x &&
    rect1.y < rect2.y + rect2.size &&
    rect1.y + rect1.size > rect2.y
  );
};

// Helper function to get a random position
const getRandomPosition = (size: number, width: number, height: number): Position => {
  return {
    x: Math.random() * (width - size),
    y: Math.random() * (height - size),
  };
};

export function GameBoard() {
  const [score, setScore] = useState(0);
  const [playerPos, setPlayerPos] = useState<Position>({ x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 });
  const [enemyPos, setEnemyPos] = useState<Position | null>(null);
  const [collectiblePos, setCollectiblePos] = useState<Position | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const enemyDirection = useRef<Position>({ x: 0, y: 0 });
  const enemyDirectionChangeCounter = useRef(0);
  const animationFrameId = useRef<number>();

  const resetGame = useCallback(() => {
    setPlayerPos({ x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 });
    setEnemyPos(getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT));
    setScore(0);
  }, []);

  // Set initial random positions only on the client
  useEffect(() => {
    setEnemyPos(getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT));
    setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
  }, []);

  // Keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const loop = () => {
      setPlayerPos(prev => {
        let { x, y } = prev;
        if (keysPressed.current['arrowup'] || keysPressed.current['w']) y -= PLAYER_SPEED;
        if (keysPressed.current['arrowdown'] || keysPressed.current['s']) y += PLAYER_SPEED;
        if (keysPressed.current['arrowleft'] || keysPressed.current['a']) x -= PLAYER_SPEED;
        if (keysPressed.current['arrowright'] || keysPressed.current['d']) x += PLAYER_SPEED;
        x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, y));
        return { x, y };
      });

      setEnemyPos(prev => {
        if (!prev) return null;

        if (enemyDirectionChangeCounter.current <= 0) {
          const angle = Math.random() * 2 * Math.PI;
          enemyDirection.current = { x: Math.cos(angle), y: Math.sin(angle) };
          enemyDirectionChangeCounter.current = ENEMY_DIRECTION_CHANGE_INTERVAL;
        } else {
          enemyDirectionChangeCounter.current--;
        }

        let { x, y } = prev;
        x += enemyDirection.current.x * ENEMY_SPEED;
        y += enemyDirection.current.y * ENEMY_SPEED;

        if (x <= 0 || x >= GAME_WIDTH - ENEMY_SIZE) enemyDirection.current.x *= -1;
        if (y <= 0 || y >= GAME_HEIGHT - ENEMY_SIZE) enemyDirection.current.y *= -1;
        
        x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, y));

        return { x, y };
      });
      
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []); // The loop runs once and uses functional updates.

  // Collision detection effect
  useEffect(() => {
    if (!enemyPos || !collectiblePos) {
      return;
    }

    if (checkCollision({ ...playerPos, size: PLAYER_SIZE }, { ...enemyPos, size: ENEMY_SIZE })) {
      resetGame();
      return; // prevent checking collectible collision on same frame as death
    }
    
    if (checkCollision({ ...playerPos, size: PLAYER_SIZE }, { ...collectiblePos, size: COLLECTIBLE_SIZE })) {
      setScore(s => s + 1);
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [playerPos, enemyPos, collectiblePos, resetGame]);

  return (
    <Card className="w-auto border-4 border-primary/20 shadow-2xl bg-card">
      <CardContent className="p-0">
        <div className="flex justify-between items-center bg-primary/10 p-2 border-b-2 border-primary/20">
          <h2 className="text-lg font-semibold text-primary font-sans">Score: {score}</h2>
        </div>
        <div
          className="relative overflow-hidden"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'hsl(var(--background))' }}
        >
          <div
            aria-label="Player"
            className="absolute bg-primary"
            style={{
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              left: playerPos.x,
              top: playerPos.y,
              transition: 'left 60ms linear, top 60ms linear',
            }}
          />
          {enemyPos && (
            <div
              aria-label="Enemy"
              className="absolute bg-destructive"
              style={{
                width: ENEMY_SIZE,
                height: ENEMY_SIZE,
                left: enemyPos.x,
                top: enemyPos.y,
                transition: 'left 60ms linear, top 60ms linear',
              }}
            />
          )}
          {collectiblePos && (
            <div
              aria-label="Collectible"
              className="absolute bg-accent"
              style={{
                width: COLLECTIBLE_SIZE,
                height: COLLECTIBLE_SIZE,
                left: collectiblePos.x,
                top: collectiblePos.y,
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
