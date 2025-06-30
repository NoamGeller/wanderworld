
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    DESKTOP_GAME_WIDTH,
    DESKTOP_GAME_HEIGHT,
    MOBILE_GAME_WIDTH,
    MOBILE_GAME_HEIGHT,
    PLAYER_SIZE,
    ENEMY_SIZE,
    COLLECTIBLE_SIZE,
    TRAP_SIZE,
    ALLY_SIZE,
    PLAYER_SPEED,
    ENEMY_SPEED,
    ALLY_SPEED,
    ENEMY_DIRECTION_CHANGE_INTERVAL,
    TRAP_PICKUP_COOLDOWN,
    HEALTH_START,
    HIT_COOLDOWN,
    KNOCKBACK_FORCE,
    KNOCKBACK_DECAY,
    ALLY_REGEN_INTERVAL,
    ALLY_RECALL_COOLDOWN,
} from './constants';
import type { Position, Character, Trap, Ally } from './types';
import { checkCollision, getRandomPosition } from './utils';

import { PlayerComponent } from './player-component';
import { EnemyComponent } from './enemy-component';
import { AllyComponent } from './ally-component';
import { CollectibleComponent } from './collectible-component';
import { TrapComponent } from './trap-component';
import { MobileControls } from './mobile-controls';

export function GameBoard() {
  const isMobile = useIsMobile();
  const GAME_WIDTH = isMobile ? MOBILE_GAME_WIDTH : DESKTOP_GAME_WIDTH;
  const GAME_HEIGHT = isMobile ? MOBILE_GAME_HEIGHT : DESKTOP_GAME_HEIGHT;

  // XP & Levels
  const [trapXp, setTrapXp] = useState(0);
  const [trapXpTarget, setTrapXpTarget] = useState(2);
  const [attackXp, setAttackXp] = useState(0);
  const [attackXpTarget, setAttackXpTarget] = useState(2);
  const [attackLevel, setAttackLevel] = useState(1);
  
  // Game State
  const [trapCount, setTrapCount] = useState(0);
  const [player, setPlayer] = useState<Character>({ pos: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 }, health: HEALTH_START, knockback: { vx: 0, vy: 0 } });
  const [enemy, setEnemy] = useState<Character | null>(null);
  const [collectiblePos, setCollectiblePos] = useState<Position | null>(null);
  const [trap, setTrap] = useState<Trap | null>(null);

  // Ally State
  const [ally, setAlly] = useState<Ally | null>(null);
  const [allyData, setAllyData] = useState<{ health: number } | null>(null);
  const [allyAwarded, setAllyAwarded] = useState(false);
  const [allyMaxHealth, setAllyMaxHealth] = useState(HEALTH_START);


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
    // Reset XP and Levels
    setTrapXp(0);
    setTrapXpTarget(2);
    setAttackXp(0);
    setAttackXpTarget(2);
    setAttackLevel(1);
    
    // Reset Game State
    setTrapCount(0);
    setTrap(null);
    setPlayer({ pos: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 }, health: HEALTH_START, knockback: { vx: 0, vy: 0 } });

    // Reset Ally State
    setAlly(null);
    setAllyData(null);
    setAllyAwarded(false);
    setAllyMaxHealth(HEALTH_START);

    // Initial Spawn
    if (isMobile !== undefined) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 } });
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, isMobile]);

  const handlePlaceTrap = useCallback(() => {
    if (trapCount > 0 && !trap) {
        setTrapCount(c => c - 1);
        const trapDistance = PLAYER_SIZE / 2 + TRAP_SIZE / 2 + 10;
        const trapX = (player.pos.x + PLAYER_SIZE / 2) + (lastMoveDirection.current.x * trapDistance) - (TRAP_SIZE / 2);
        const trapY = (player.pos.y + PLAYER_SIZE / 2) + (lastMoveDirection.current.y * trapDistance) - (TRAP_SIZE / 2);
        setTrap({ pos: { x: trapX, y: trapY }, placedAt: Date.now() });
    }
  }, [trapCount, trap, player.pos]);

  const handleSpawnAlly = useCallback(() => {
    if (allyData && !ally && allyData.health > 0) {
      const allyDistance = PLAYER_SIZE / 2 + ALLY_SIZE / 2 + 5;
      const allyX = (player.pos.x + PLAYER_SIZE / 2) + (lastMoveDirection.current.x * allyDistance) - (ALLY_SIZE / 2);
      const allyY = (player.pos.y + PLAYER_SIZE / 2) + (lastMoveDirection.current.y * allyDistance) - (ALLY_SIZE / 2);
      setAlly({ pos: { x: allyX, y: allyY }, health: allyData.health, knockback: { vx: 0, vy: 0 }, spawnedAt: Date.now() });
    }
  }, [allyData, ally, player.pos]);

  useEffect(() => {
    resetGame();
  }, [GAME_WIDTH, GAME_HEIGHT, resetGame]);

  // Trap XP Level Up
  useEffect(() => {
    if (allyAwarded && trapXp >= trapXpTarget) {
      setTrapXp(xp => xp - trapXpTarget);
      setTrapXpTarget(t => t + 1);
      
      const newMaxHealth = allyMaxHealth + 1;
      setAllyMaxHealth(newMaxHealth);
      
      if (ally) {
          setAlly(a => a ? { ...a, health: Math.min(a.health + 1, newMaxHealth) } : null);
      }
      if (allyData) {
          setAllyData(d => d ? { ...d, health: Math.min(d.health + 1, newMaxHealth) } : null);
      }
    }
  }, [trapXp, trapXpTarget, allyAwarded, ally, allyData, allyMaxHealth]);

  // Attack XP Level Up
  useEffect(() => {
    if (attackXp >= attackXpTarget) {
        setAttackXp(xp => xp - attackXpTarget);
        setAttackXpTarget(t => t + 1);
        setAttackLevel(l => l + 1);
    }
  }, [attackXp, attackXpTarget]);


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
    const maxDistance = 50; // JOYSTICK_BASE_RADIUS

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
        let { pos, health, knockback } = prev;
        let x = pos.x;
        let y = pos.y;
        
        x += knockback.vx;
        y += knockback.vy;

        const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
        if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
        if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;
        
        if (newKnockback.vx === 0 && newKnockback.vy === 0) {
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
        }

        x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, y));
        return { pos: { x, y }, health, knockback: newKnockback };
      });

      setEnemy(prev => {
        if (!prev) return null;
        let { pos, health, knockback } = prev;
        let x = pos.x;
        let y = pos.y;

        x += knockback.vx;
        y += knockback.vy;

        const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
        if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
        if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;

        if (newKnockback.vx === 0 && newKnockback.vy === 0) {
          if (enemyDirectionChangeCounter.current <= 0) {
            const angle = Math.random() * 2 * Math.PI;
            enemyDirection.current = { x: Math.cos(angle), y: Math.sin(angle) };
            enemyDirectionChangeCounter.current = ENEMY_DIRECTION_CHANGE_INTERVAL;
          } else {
            enemyDirectionChangeCounter.current--;
          }
          x += enemyDirection.current.x * ENEMY_SPEED;
          y += enemyDirection.current.y * ENEMY_SPEED;
          if (x <= 0 || x >= GAME_WIDTH - ENEMY_SIZE) enemyDirection.current.x *= -1;
          if (y <= 0 || y >= GAME_HEIGHT - ENEMY_SIZE) enemyDirection.current.y *= -1;
        }

        x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, y));
        return { pos: {x, y}, health, knockback: newKnockback };
      });

      setAlly(prevAlly => {
        if (!prevAlly || !enemy) return prevAlly;
        
        let { pos, health, knockback, spawnedAt } = prevAlly;
        let x = pos.x;
        let y = pos.y;

        x += knockback.vx;
        y += knockback.vy;

        const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
        if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
        if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;

        if (newKnockback.vx === 0 && newKnockback.vy === 0) {
          const dx = enemy.pos.x - x;
          const dy = enemy.pos.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 1) {
              const moveX = (dx / distance) * ALLY_SPEED;
              const moveY = (dy / distance) * ALLY_SPEED;
              x += moveX;
              y += moveY;
          }
        }
        
        x = Math.max(0, Math.min(GAME_WIDTH - ALLY_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - ALLY_SIZE, y));
        return { pos: {x, y}, health, knockback: newKnockback, spawnedAt };
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
    if (player.health <= 0) {
      resetGame();
      return;
    }
    
    if (!enemy || !collectiblePos) return;

    // Player recalls ally by touch
    if (ally && checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...ally.pos, size: ALLY_SIZE }) && Date.now() - ally.spawnedAt > ALLY_RECALL_COOLDOWN) {
        setAllyData({ health: ally.health });
        setAlly(null);
        return; // Exit to avoid other ally logic this frame
    }

    // Trap collision (instant kill)
    if (trap && checkCollision({ ...enemy.pos, size: ENEMY_SIZE }, { ...trap.pos, size: TRAP_SIZE })) {
      setTrapXp(s => s + 1);
      if (!allyAwarded) {
        setAllyAwarded(true);
        setAllyData({ health: allyMaxHealth });
      }
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 } });
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
        const knockbackVX = (dx / distance) * KNOCKBACK_FORCE;
        const knockbackVY = (dy / distance) * KNOCKBACK_FORCE;
        
        setPlayer(p => ({ ...p, health: p.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } }));
        setEnemy(e => {
            if (!e) return null;
            return { ...e, health: e.health - 1, knockback: { vx: knockbackVX, vy: knockbackVY } };
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
        const knockbackVX = (dx / distance) * KNOCKBACK_FORCE;
        const knockbackVY = (dy / distance) * KNOCKBACK_FORCE;

        setAlly(a => {
            if (!a) return null;
            const newHealth = a.health - 1;
            return { ...a, health: newHealth, knockback: { vx: -knockbackVX, vy: -knockbackVY } };
        });
        setEnemy(e => {
            if (!e) return null;
            const newHealth = e.health - attackLevel;
            return { ...e, health: newHealth, knockback: { vx: knockbackVX, vy: knockbackVY } };
        });
        setTimeout(() => { allyHitCooldown.current = false; }, HIT_COOLDOWN);
      }
    }

    // Check for deaths from combat
    if (ally && ally.health <= 0) {
      setAllyData({ health: 0 });
      setAlly(null);
    }
    if (enemy.health <= 0) {
      setAttackXp(xp => xp + 1);
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 } });
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
  }, [player, enemy, collectiblePos, trap, ally, resetGame, GAME_WIDTH, GAME_HEIGHT, allyAwarded, attackLevel, allyMaxHealth]);

  // Ally health regeneration
  useEffect(() => {
    if (ally || !allyData || allyData.health >= allyMaxHealth) {
      return;
    }

    const intervalId = setInterval(() => {
      setAllyData(d => {
        if (!d || d.health >= allyMaxHealth) {
          if (intervalId) clearInterval(intervalId);
          return d;
        }
        const newHealth = d.health + 1;
        if(newHealth >= allyMaxHealth) {
            clearInterval(intervalId);
        }
        return { health: newHealth };
      });
    }, ALLY_REGEN_INTERVAL);

    return () => clearInterval(intervalId);
  }, [ally, allyData, allyMaxHealth]);

  useEffect(() => {
    if (isMobile === undefined) return;
    if (enemy === null) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 } });
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
        <div className="grid grid-cols-2 gap-2 items-center bg-primary/10 p-2 border-b-2 border-primary/20 text-center">
          <h2 className="text-base font-semibold text-primary font-sans">Trap XP: {trapXp}/{trapXpTarget}</h2>
          <h2 className="text-base font-semibold text-primary font-sans">Attack XP: {attackXp}/{attackXpTarget}</h2>
        </div>
        <div
          className="relative overflow-hidden"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'hsl(var(--background))' }}
        >
          <PlayerComponent player={player} />
          {enemy && <EnemyComponent enemy={enemy} />}
          {collectiblePos && <CollectibleComponent position={collectiblePos} />}
          {trap && <TrapComponent position={trap.pos} />}
          {ally && <AllyComponent ally={ally} attackLevel={attackLevel} />}
        </div>
        {isMobile && (
            <MobileControls
                joystickAreaRef={joystickAreaRef}
                handleTouchStart={handleTouchStart}
                handleTouchMove={handleTouchMove}
                handleTouchEnd={handleTouchEnd}
                handlePos={handlePos}
                isDragging={isDragging}
                handlePlaceTrap={handlePlaceTrap}
                trapCount={trapCount}
                trap={trap}
                handleSpawnAlly={handleSpawnAlly}
                allyData={allyData}
                ally={ally}
            />
        )}
      </CardContent>
    </Card>
  );
}
