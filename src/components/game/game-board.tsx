
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

// Game Constants
const DESKTOP_GAME_WIDTH = 500;
const DESKTOP_GAME_HEIGHT = 400;
const MOBILE_GAME_WIDTH = 340;
const MOBILE_GAME_HEIGHT = 420;

const PLAYER_SIZE = 20;
const ENEMY_SIZE = 20;
const COLLECTIBLE_SIZE = 15;
const TRAP_SIZE = 22;
const PLAYER_SPEED = 3;
const ENEMY_SPEED = 1.5;
const ENEMY_DIRECTION_CHANGE_INTERVAL = 120; // in frames
const TRAP_PICKUP_COOLDOWN = 1000; // in milliseconds

// Joystick Constants
const JOYSTICK_AREA_HEIGHT = 120;
const JOYSTICK_BASE_RADIUS = 40;
const JOYSTICK_HANDLE_RADIUS = 20;
const ACTION_BUTTON_SIZE = 80;

type Position = {
  x: number;
  y: number;
};

type Trap = {
    pos: Position;
    placedAt: number;
}

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
  const isMobile = useIsMobile();
  const GAME_WIDTH = isMobile ? MOBILE_GAME_WIDTH : DESKTOP_GAME_WIDTH;
  const GAME_HEIGHT = isMobile ? MOBILE_GAME_HEIGHT : DESKTOP_GAME_HEIGHT;

  const [score, setScore] = useState(0);
  const [trapCount, setTrapCount] = useState(0);
  const [playerPos, setPlayerPos] = useState<Position>({ x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 });
  const [enemyPos, setEnemyPos] = useState<Position | null>(null);
  const [collectiblePos, setCollectiblePos] = useState<Position | null>(null);
  const [trap, setTrap] = useState<Trap | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const enemyDirection = useRef<Position>({ x: 0, y: 0 });
  const enemyDirectionChangeCounter = useRef(0);
  const animationFrameId = useRef<number>();

  // Joystick state
  const [isDragging, setIsDragging] = useState(false);
  const [handlePos, setHandlePos] = useState<Position>({ x: 0, y: 0 }); // translation from center
  const playerDirection = useRef<Position>({ x: 0, y: 0 });
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const lastMoveDirection = useRef<Position>({ x: 0, y: -1 }); // Default to up

  const resetGame = useCallback(() => {
    setScore(0);
    setTrapCount(0);
    setTrap(null);
    setPlayerPos({ x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 });
    if (isMobile !== undefined) {
      setEnemyPos(getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT));
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, isMobile]);

  const handlePlaceTrap = useCallback(() => {
    if (trapCount > 0 && !trap) {
        setTrapCount(c => c - 1);
        
        const trapDistance = PLAYER_SIZE / 2 + TRAP_SIZE / 2 + 10; // Distance from player center to trap center

        // Place trap in opposite direction of last movement
        const trapX = (playerPos.x + PLAYER_SIZE / 2) - (lastMoveDirection.current.x * trapDistance) - (TRAP_SIZE / 2);
        const trapY = (playerPos.y + PLAYER_SIZE / 2) - (lastMoveDirection.current.y * trapDistance) - (TRAP_SIZE / 2);
        
        setTrap({ pos: { x: trapX, y: trapY }, placedAt: Date.now() });
    }
  }, [trapCount, trap, playerPos]);

  // Set/reset positions on dimension change
  useEffect(() => {
    resetGame();
  }, [GAME_WIDTH, GAME_HEIGHT, resetGame]);

  // Keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
          e.preventDefault();
          handlePlaceTrap();
          return;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
          e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePlaceTrap]);

  // Joystick touch handlers
  const updateHandle = (touch: { clientX: number, clientY: number }) => {
    if (!joystickAreaRef.current) return;
    const joystickCenter = {
      x: joystickAreaRef.current.offsetWidth / 2,
      y: joystickAreaRef.current.offsetHeight / 2,
    };
    const rect = joystickAreaRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    const dx = touchX - joystickCenter.x;
    const dy = touchY - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxDistance = JOYSTICK_BASE_RADIUS;

    if (distance > maxDistance) {
      const x = (dx / distance) * maxDistance;
      const y = (dy / distance) * maxDistance;
      setHandlePos({ x, y });
      playerDirection.current = { x: x / maxDistance, y: y / maxDistance };
    } else {
      setHandlePos({ x: dx, y: dy });
      playerDirection.current = { x: dx / maxDistance, y: dy / maxDistance };
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (joystickTouchId.current === null && touch) {
        joystickTouchId.current = touch.identifier;
        setIsDragging(true);
        updateHandle(touch);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchId.current === null) return;
    const touch = Array.from(e.touches).find(t => t.identifier === joystickTouchId.current);
    if (touch) {
        updateHandle(touch);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchId.current === null) return;
    const touchEnded = Array.from(e.changedTouches).some(t => t.identifier === joystickTouchId.current);
    if (touchEnded) {
        joystickTouchId.current = null;
        setIsDragging(false);
        setHandlePos({ x: 0, y: 0 });
        playerDirection.current = { x: 0, y: 0 };
    }
  };

  // Game loop
  useEffect(() => {
    const loop = () => {
      setPlayerPos(prev => {
        let { x, y } = prev;

        let moveX = 0;
        let moveY = 0;

        if (isMobile) {
            moveX = playerDirection.current.x;
            moveY = playerDirection.current.y;
        } else {
            if (keysPressed.current['arrowup'] || keysPressed.current['w']) moveY -= 1;
            if (keysPressed.current['arrowdown'] || keysPressed.current['s']) moveY += 1;
            if (keysPressed.current['arrowleft'] || keysPressed.current['a']) moveX -= 1;
            if (keysPressed.current['arrowright'] || keysPressed.current['d']) moveX += 1;

            const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            if (magnitude > 1) {
                moveX /= magnitude;
                moveY /= magnitude;
            }
        }
        
        if (moveX !== 0 || moveY !== 0) {
            lastMoveDirection.current = { x: moveX, y: moveY };
        }

        x += moveX * PLAYER_SPEED;
        y += moveY * PLAYER_SPEED;

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
  }, [isMobile, GAME_WIDTH, GAME_HEIGHT]);

  // Collision detection effect
  useEffect(() => {
    // Enemy and collectible might be null on first render, so we check
    if (!enemyPos || !collectiblePos) {
      return;
    }

    if (checkCollision({ ...playerPos, size: PLAYER_SIZE }, { ...enemyPos, size: ENEMY_SIZE })) {
      resetGame();
      return;
    }

    if (checkCollision({ ...playerPos, size: PLAYER_SIZE }, { ...collectiblePos, size: COLLECTIBLE_SIZE })) {
      setTrapCount(s => s + 1);
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
    
    if (trap) {
      if (checkCollision({ ...enemyPos, size: ENEMY_SIZE }, { ...trap.pos, size: TRAP_SIZE })) {
        setScore(s => s + 1);
        setEnemyPos(getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT));
        setTrap(null);
      } else if (
        checkCollision({ ...playerPos, size: PLAYER_SIZE }, { ...trap.pos, size: TRAP_SIZE }) &&
        Date.now() - trap.placedAt > TRAP_PICKUP_COOLDOWN
      ) {
        setTrapCount(c => c + 1);
        setTrap(null);
      }
    }
  }, [playerPos, enemyPos, collectiblePos, trap, resetGame, GAME_WIDTH, GAME_HEIGHT]);

  // Initialize enemy and collectible positions on the client
  useEffect(() => {
    if (isMobile === undefined) return;
    if (enemyPos === null) {
      setEnemyPos(getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
    if (collectiblePos === null) {
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, enemyPos, collectiblePos, isMobile]);

  if (isMobile === undefined) {
    return null;
  }

  return (
    <Card className="w-auto border-4 border-primary/20 shadow-2xl bg-card">
      <CardContent className="p-0">
        <div className="flex justify-between items-center bg-primary/10 p-2 border-b-2 border-primary/20">
          <h2 className="text-lg font-semibold text-primary font-sans">Score: {score}</h2>
          <h2 className="text-lg font-semibold text-primary font-sans">Traps: {trapCount}</h2>
        </div>
        <div
          className="relative overflow-hidden"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'hsl(var(--background))' }}
        >
          <div
            aria-label="Player"
            className="absolute bg-primary rounded-full"
            style={{
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              left: playerPos.x,
              top: playerPos.y,
            }}
          />
          {enemyPos && (
            <div
              aria-label="Enemy"
              className="absolute bg-destructive rounded-full"
              style={{
                width: ENEMY_SIZE,
                height: ENEMY_SIZE,
                left: enemyPos.x,
                top: enemyPos.y,
              }}
            />
          )}
          {collectiblePos && (
            <div
              aria-label="Collectible"
              className="absolute bg-accent rounded-full"
              style={{
                width: COLLECTIBLE_SIZE,
                height: COLLECTIBLE_SIZE,
                left: collectiblePos.x,
                top: collectiblePos.y,
              }}
            />
          )}
          {trap && (
            <div
                aria-label="Trap"
                className="absolute bg-transparent border-2 border-dashed border-destructive/80 rounded-full"
                style={{
                    width: TRAP_SIZE,
                    height: TRAP_SIZE,
                    left: trap.pos.x,
                    top: trap.pos.y,
                }}
            />
          )}
        </div>
        {isMobile && (
            <div
                className="flex items-center justify-around w-full select-none p-2"
                style={{ height: JOYSTICK_AREA_HEIGHT, background: 'hsl(var(--card))' }}
            >
                <div
                    ref={joystickAreaRef}
                    className="relative flex items-center justify-center w-28 h-28 touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <div
                        className="rounded-full bg-primary/20"
                        style={{
                            width: JOYSTICK_BASE_RADIUS * 2,
                            height: JOYSTICK_BASE_RADIUS * 2,
                        }}
                    />
                    <div
                        className="absolute rounded-full bg-primary/50 cursor-pointer"
                        style={{
                            width: JOYSTICK_HANDLE_RADIUS * 2,
                            height: JOYSTICK_HANDLE_RADIUS * 2,
                            transform: `translate(${handlePos.x}px, ${handlePos.y}px)`,
                            transition: isDragging ? 'none' : 'transform 100ms linear',
                        }}
                    />
                </div>
                <button
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handlePlaceTrap();
                    }}
                    onClick={(e) => { // Fallback for desktop testing
                      e.preventDefault();
                      handlePlaceTrap();
                    }}
                    disabled={trapCount === 0 || !!trap}
                    className="relative flex items-center justify-center rounded-full bg-secondary disabled:bg-muted disabled:opacity-50 transition-colors"
                    style={{ width: ACTION_BUTTON_SIZE, height: ACTION_BUTTON_SIZE }}
                    aria-label="Place Trap"
                >
                    <div
                        className="bg-accent rounded-full"
                        style={{
                            width: COLLECTIBLE_SIZE * 1.5,
                            height: COLLECTIBLE_SIZE * 1.5,
                        }}
                    />
                    {trapCount > 0 && (
                        <span className="absolute -top-1 -left-1 flex items-center justify-center w-7 h-7 text-sm font-bold text-primary-foreground bg-primary rounded-full border-2 border-card">
                            {trapCount}
                        </span>
                    )}
                </button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
