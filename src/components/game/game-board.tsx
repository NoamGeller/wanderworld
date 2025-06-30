
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Heart } from 'lucide-react';

// Game Constants
const DESKTOP_GAME_WIDTH = 500;
const DESKTOP_GAME_HEIGHT = 400;
const MOBILE_GAME_WIDTH = 340;
const MOBILE_GAME_HEIGHT = 420;

const PLAYER_SIZE = 20;
const ENEMY_SIZE = 20;
const COLLECTIBLE_SIZE = 15;
const TRAP_SIZE = 22;
const ALLY_SIZE = 20;
const PLAYER_SPEED = 3;
const ENEMY_SPEED = 1.5;
const ALLY_SPEED = 2.5;
const ENEMY_DIRECTION_CHANGE_INTERVAL = 120; // in frames
const TRAP_PICKUP_COOLDOWN = 1000; // in milliseconds
const HEALTH_START = 3;
const HIT_COOLDOWN = 1000; // in milliseconds
const KNOCKBACK_DISTANCE = 15;

// Joystick Constants
const JOYSTICK_AREA_HEIGHT = 120;
const JOYSTICK_BASE_RADIUS = 40;
const JOYSTICK_HANDLE_RADIUS = 20;
const ACTION_BUTTON_SIZE = 80;

type Position = {
  x: number;
  y: number;
};

type Character = {
  pos: Position;
  health: number;
};

type Trap = {
    pos: Position;
    placedAt: number;
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
  const isMobile = useIsMobile();
  const GAME_WIDTH = isMobile ? MOBILE_GAME_WIDTH : DESKTOP_GAME_WIDTH;
  const GAME_HEIGHT = isMobile ? MOBILE_GAME_HEIGHT : DESKTOP_GAME_HEIGHT;

  const [trapScore, setTrapScore] = useState(0);
  const [allyScore, setAllyScore] = useState(0);
  const [trapCount, setTrapCount] = useState(0);
  const [player, setPlayer] = useState<Character>({ pos: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 }, health: HEALTH_START });
  const [enemy, setEnemy] = useState<Character | null>(null);
  const [collectiblePos, setCollectiblePos] = useState<Position | null>(null);
  const [trap, setTrap] = useState<Trap | null>(null);
  const [ally, setAlly] = useState<Character | null>(null);
  const [allyAvailable, setAllyAvailable] = useState(false);
  const [allyAwarded, setAllyAwarded] = useState(false);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const enemyDirection = useRef<Position>({ x: 0, y: 0 });
  const enemyDirectionChangeCounter = useRef(0);
  const animationFrameId = useRef<number>();
  const playerHitCooldown = useRef(false);
  const allyHitCooldown = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [handlePos, setHandlePos] = useState<Position>({ x: 0, y: 0 });
  const playerDirection = useRef<Position>({ x: 0, y: 0 });
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const lastMoveDirection = useRef<Position>({ x: 0, y: -1 });

  const resetGame = useCallback(() => {
    setTrapScore(0);
    setAllyScore(0);
    setTrapCount(0);
    setTrap(null);
    setAlly(null);
    setAllyAvailable(false);
    setAllyAwarded(false);
    setPlayer({ pos: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 }, health: HEALTH_START });
    if (isMobile !== undefined) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START });
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, isMobile]);

  const handlePlaceTrap = useCallback(() => {
    if (trapCount > 0 && !trap) {
        setTrapCount(c => c - 1);
        const trapDistance = PLAYER_SIZE / 2 + TRAP_SIZE / 2 + 10;
        const trapX = (player.pos.x + PLAYER_SIZE / 2) - (lastMoveDirection.current.x * trapDistance) - (TRAP_SIZE / 2);
        const trapY = (player.pos.y + PLAYER_SIZE / 2) - (lastMoveDirection.current.y * trapDistance) - (TRAP_SIZE / 2);
        setTrap({ pos: { x: trapX, y: trapY }, placedAt: Date.now() });
    }
  }, [trapCount, trap, player.pos]);

  const handleSpawnAlly = useCallback(() => {
    if (allyAvailable && !ally) {
      setAllyAvailable(false);
      const allyDistance = PLAYER_SIZE / 2 + ALLY_SIZE / 2 + 5;
      const allyX = (player.pos.x + PLAYER_SIZE / 2) + (lastMoveDirection.current.x * allyDistance) - (ALLY_SIZE / 2);
      const allyY = (player.pos.y + PLAYER_SIZE / 2) + (lastMoveDirection.current.y * allyDistance) - (ALLY_SIZE / 2);
      setAlly({ pos: { x: allyX, y: allyY }, health: HEALTH_START });
    }
  }, [allyAvailable, ally, player.pos]);

  useEffect(() => {
    resetGame();
  }, [GAME_WIDTH, GAME_HEIGHT, resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
          e.preventDefault();
          handlePlaceTrap();
          return;
      }
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleSpawnAlly();
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
  }, [handlePlaceTrap, handleSpawnAlly]);

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

  useEffect(() => {
    const loop = () => {
      setPlayer(prev => {
        let { pos, health } = prev;
        let x = pos.x;
        let y = pos.y;
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
        return { pos: { x, y }, health };
      });

      setEnemy(prev => {
        if (!prev) return null;
        if (enemyDirectionChangeCounter.current <= 0) {
          const angle = Math.random() * 2 * Math.PI;
          enemyDirection.current = { x: Math.cos(angle), y: Math.sin(angle) };
          enemyDirectionChangeCounter.current = ENEMY_DIRECTION_CHANGE_INTERVAL;
        } else {
          enemyDirectionChangeCounter.current--;
        }
        let { pos, health } = prev;
        let x = pos.x;
        let y = pos.y;
        x += enemyDirection.current.x * ENEMY_SPEED;
        y += enemyDirection.current.y * ENEMY_SPEED;
        if (x <= 0 || x >= GAME_WIDTH - ENEMY_SIZE) enemyDirection.current.x *= -1;
        if (y <= 0 || y >= GAME_HEIGHT - ENEMY_SIZE) enemyDirection.current.y *= -1;
        x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, y));
        return { pos: {x, y}, health };
      });

      setAlly(prevAlly => {
        if (!prevAlly || !enemy) return prevAlly;
        const dx = enemy.pos.x - prevAlly.pos.x;
        const dy = enemy.pos.y - prevAlly.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1) {
            return prevAlly;
        }
        const moveX = (dx / distance) * ALLY_SPEED;
        const moveY = (dy / distance) * ALLY_SPEED;
        let { pos, health } = prevAlly;
        let x = pos.x;
        let y = pos.y;
        x += moveX;
        y += moveY;
        x = Math.max(0, Math.min(GAME_WIDTH - ALLY_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - ALLY_SIZE, y));
        return { pos: {x, y}, health };
      });

      animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isMobile, GAME_WIDTH, GAME_HEIGHT, enemy]);

  useEffect(() => {
    if (!enemy || !collectiblePos) return;

    // Trap collision (instant kill)
    if (trap && checkCollision({ ...enemy.pos, size: ENEMY_SIZE }, { ...trap.pos, size: TRAP_SIZE })) {
      setTrapScore(s => s + 1);
      if (!allyAwarded) {
        setAllyAwarded(true);
        setAllyAvailable(true);
      }
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START });
      setTrap(null);
      return;
    }

    // Player vs Enemy combat
    if (checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...enemy.pos, size: ENEMY_SIZE })) {
      if (!playerHitCooldown.current) {
        playerHitCooldown.current = true;
        
        const dx = enemy.pos.x - player.pos.x;
        const dy = enemy.pos.y - player.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const knockbackX = (dx / distance) * KNOCKBACK_DISTANCE;
        const knockbackY = (dy / distance) * KNOCKBACK_DISTANCE;

        setPlayer(p => {
            const newPos = {
                x: Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, p.pos.x - knockbackX)),
                y: Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, p.pos.y - knockbackY)),
            };
            return { ...p, health: p.health - 1, pos: newPos };
        });
        setEnemy(e => {
            if (!e) return null;
            const newPos = {
                x: Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, e.pos.x + knockbackX)),
                y: Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, e.pos.y + knockbackY)),
            };
            return { ...e, health: e.health - 1, pos: newPos };
        });
        setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
      }
    }

    // Ally vs Enemy combat
    if (ally && checkCollision({ ...ally.pos, size: ALLY_SIZE }, { ...enemy.pos, size: ENEMY_SIZE })) {
      if (!allyHitCooldown.current) {
        allyHitCooldown.current = true;

        const dx = enemy.pos.x - ally.pos.x;
        const dy = enemy.pos.y - ally.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const knockbackX = (dx / distance) * KNOCKBACK_DISTANCE;
        const knockbackY = (dy / distance) * KNOCKBACK_DISTANCE;

        setAlly(a => {
            if (!a) return null;
            const newPos = {
                x: Math.max(0, Math.min(GAME_WIDTH - ALLY_SIZE, a.pos.x - knockbackX)),
                y: Math.max(0, Math.min(GAME_HEIGHT - ALLY_SIZE, a.pos.y - knockbackY)),
            };
            return { ...a, health: a.health - 1, pos: newPos };
        });
        setEnemy(e => {
            if (!e) return null;
            const newPos = {
                x: Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, e.pos.x + knockbackX)),
                y: Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, e.pos.y + knockbackY)),
            };
            return { ...e, health: e.health - 1, pos: newPos };
        });
        setTimeout(() => { allyHitCooldown.current = false; }, HIT_COOLDOWN);
      }
    }

    // Check for deaths from combat
    if (player.health <= 0) {
      resetGame();
      return;
    }
    if (ally && ally.health <= 0) {
      setAlly(null);
    }
    if (enemy.health <= 0) {
      setAllyScore(s => s + 1);
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START });
      return;
    }

    // Item pickups
    if (checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...collectiblePos, size: COLLECTIBLE_SIZE })) {
      setTrapCount(s => s + 1);
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
    if (trap && checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...trap.pos, size: TRAP_SIZE }) && Date.now() - trap.placedAt > TRAP_PICKUP_COOLDOWN) {
      setTrapCount(c => c + 1);
      setTrap(null);
    }
  }, [player, enemy, collectiblePos, trap, ally, resetGame, GAME_WIDTH, GAME_HEIGHT, allyAwarded]);

  useEffect(() => {
    if (isMobile === undefined) return;
    if (enemy === null) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START });
    }
    if (collectiblePos === null) {
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, enemy, collectiblePos, isMobile]);

  if (isMobile === undefined) {
    return null;
  }

  return (
    <Card className="w-auto border-4 border-primary/20 shadow-2xl bg-card">
      <CardContent className="p-0">
        <div className="grid grid-cols-3 gap-2 items-center bg-primary/10 p-2 border-b-2 border-primary/20 text-center">
          <h2 className="text-base font-semibold text-primary font-sans">Trap XP: {trapScore}</h2>
          <h2 className="text-base font-semibold text-primary font-sans">Ally XP: {allyScore}</h2>
          <h2 className="text-base font-semibold text-primary font-sans">Traps: {trapCount}</h2>
        </div>
        <div
          className="relative overflow-hidden"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'hsl(var(--background))' }}
        >
          <div className="absolute" style={{ width: PLAYER_SIZE, height: PLAYER_SIZE, left: player.pos.x, top: player.pos.y }}>
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 select-none whitespace-nowrap">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="text-xs font-bold text-foreground">{player.health}</span>
            </div>
            <div aria-label="Player" className="w-full h-full bg-primary rounded-full" />
          </div>

          {enemy && (
            <div className="absolute" style={{ width: ENEMY_SIZE, height: ENEMY_SIZE, left: enemy.pos.x, top: enemy.pos.y }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 select-none whitespace-nowrap">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span className="text-xs font-bold text-foreground">{enemy.health}</span>
                </div>
                <div aria-label="Enemy" className="w-full h-full bg-destructive rounded-full" />
            </div>
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

          {ally && (
             <div className="absolute" style={{ width: ALLY_SIZE, height: ALLY_SIZE, left: ally.pos.x, top: ally.pos.y }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 select-none whitespace-nowrap">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span className="text-xs font-bold text-foreground">{ally.health}</span>
                </div>
                <div aria-label="Ally" className="w-full h-full bg-[hsl(var(--chart-2))] rounded-full" />
            </div>
          )}
        </div>
        {isMobile && (
            <div
                className="flex items-center justify-around w-full select-none p-2"
                style={{ height: JOYSTICK_AREA_HEIGHT, background: 'hsl(var(--card))' }}
            >
                <div
                    ref={joystickAreaRef}
                    className="relative flex items-center justify-center w-28 h-28"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <div
                        className="rounded-full bg-primary/20 touch-none"
                        style={{
                            width: JOYSTICK_BASE_RADIUS * 2,
                            height: JOYSTICK_BASE_RADIUS * 2,
                        }}
                    />
                    <div
                        className="absolute rounded-full bg-primary/50 cursor-pointer touch-none"
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
                    onClick={(e) => {
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
                <button
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleSpawnAlly();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSpawnAlly();
                    }}
                    disabled={!allyAvailable || !!ally}
                    className="relative flex items-center justify-center rounded-full bg-secondary disabled:bg-muted disabled:opacity-50 transition-colors"
                    style={{ width: ACTION_BUTTON_SIZE, height: ACTION_BUTTON_SIZE }}
                    aria-label="Spawn Ally"
                >
                    {allyAvailable && (
                        <div
                            className="bg-[hsl(var(--chart-2))] rounded-full"
                            style={{
                                width: ALLY_SIZE * 1.5,
                                height: ALLY_SIZE * 1.5,
                            }}
                        />
                    )}
                </button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
