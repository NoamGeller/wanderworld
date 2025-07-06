
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
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
    WATER_ENEMY_ATTACK_INTERVAL,
    PROJECTILE_SPEED,
    PROJECTILE_GROWTH_DURATION,
    PROJECTILE_MAX_LENGTH,
    PROJECTILE_THICKNESS,
} from '@/components/game/constants';
import type { Position, Character, Trap, Ally, EnemyType, WaterProjectile } from '@/components/game/types';
import { checkCollision, getRandomPosition, getRandomEnemyType, checkCircleCollision } from '@/components/game/utils';

type GameEngineProps = {
  GAME_WIDTH: number;
  GAME_HEIGHT: number;
  isMobile: boolean | undefined;
};

export function useGameEngine({ GAME_WIDTH, GAME_HEIGHT, isMobile }: GameEngineProps) {
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enabledEnemyTypes, setEnabledEnemyTypes] = useState<EnemyType[]>(['fire', 'water', 'earth', 'air']);
  const [projectiles, setProjectiles] = useState<WaterProjectile[]>([]);

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

  // Joystick Controls
  const [isDragging, setIsDragging] = useState(false);
  const [handlePos, setHandlePos] = useState<Position>({ x: 0, y: 0 });
  const playerDirection = useRef<Position>({ x: 0, y: 0 });
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const lastMoveDirection = useRef<Position>({ x: 0, y: -1 });

  // Touch-to-move Controls
  const [touchMoveTarget, setTouchMoveTarget] = useState<Position | null>(null);
  const gameAreaTouchId = useRef<number | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const resetGame = useCallback(() => {
    setTrapXp(0);
    setTrapXpTarget(2);
    setAttackXp(0);
    setAttackXpTarget(2);
    setAttackLevel(1);
    setTrapCount(0);
    setTrap(null);
    setPlayer({ pos: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 }, health: HEALTH_START, knockback: { vx: 0, vy: 0 } });
    setProjectiles([]);
    setAlly(null);
    setAllyData(null);
    setAllyAwarded(false);
    setAllyMaxHealth(HEALTH_START);

    if (isMobile !== undefined) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: 0 });
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, isMobile, enabledEnemyTypes]);

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

  useEffect(() => {
    if (attackXp >= attackXpTarget) {
        setAttackXp(xp => xp - attackXpTarget);
        setAttackXpTarget(t => t + 1);
        setAttackLevel(l => l + 1);
    }
  }, [attackXp, attackXpTarget]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); handlePlaceTrap(); return; }
      if (e.key.toLowerCase() === 'e') { e.preventDefault(); handleSpawnAlly(); return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) { e.preventDefault(); }
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) { e.preventDefault(); }
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePlaceTrap, handleSpawnAlly]);

  const updateHandle = useCallback((touch: { clientX: number, clientY: number }) => {
    if (!joystickAreaRef.current) return;
    const joystickCenter = { x: joystickAreaRef.current.offsetWidth / 2, y: joystickAreaRef.current.offsetHeight / 2 };
    const rect = joystickAreaRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const dx = touchX - joystickCenter.x;
    const dy = touchY - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 50;
    if (distance > maxDistance) {
      const x = (dx / distance) * maxDistance;
      const y = (dy / distance) * maxDistance;
      setHandlePos({ x, y });
      playerDirection.current = { x: x / maxDistance, y: y / maxDistance };
    } else {
      setHandlePos({ x: dx, y: dy });
      playerDirection.current = { x: dx / maxDistance, y: dy / maxDistance };
    }
  }, []);

  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (joystickTouchId.current === null && touch) {
        joystickTouchId.current = touch.identifier;
        setIsDragging(true);
        updateHandle(touch);
    }
  }, [updateHandle]);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchId.current === null) return;
    const touch = Array.from(e.touches).find(t => t.identifier === joystickTouchId.current);
    if (touch) {
        updateHandle(touch);
    }
  }, [updateHandle]);

  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchId.current === null) return;
    const touchEnded = Array.from(e.changedTouches).some(t => t.identifier === joystickTouchId.current);
    if (touchEnded) {
        joystickTouchId.current = null;
        setIsDragging(false);
        setHandlePos({ x: 0, y: 0 });
        playerDirection.current = { x: 0, y: 0 };
    }
  }, []);

  const handleGameAreaTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    if (gameAreaRef.current && touch) {
      gameAreaTouchId.current = touch.identifier;
      const rect = gameAreaRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      setTouchMoveTarget({ x: touchX, y: touchY });
    }
  }, []);

  const handleGameAreaTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (gameAreaTouchId.current === null) return;
    const touch = Array.from(e.touches).find(t => t.identifier === gameAreaTouchId.current);
    if (gameAreaRef.current && touch) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      setTouchMoveTarget({ x: touchX, y: touchY });
    }
  }, []);

  const handleGameAreaTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touchEnded = Array.from(e.changedTouches).some(t => t.identifier === gameAreaTouchId.current);
    if (touchEnded) {
      gameAreaTouchId.current = null;
      setTouchMoveTarget(null);
    }
  }, []);

  useEffect(() => {
    const loop = () => {
      setPlayer(prev => {
        let { pos, health, knockback } = prev;
        let x = pos.x, y = pos.y;
        x += knockback.vx; y += knockback.vy;
        const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
        if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
        if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;
        if (newKnockback.vx === 0 && newKnockback.vy === 0) {
          let moveX = 0, moveY = 0;
          if (isMobile) {
            if (playerDirection.current.x !== 0 || playerDirection.current.y !== 0) {
              moveX = playerDirection.current.x; moveY = playerDirection.current.y;
            } else if (touchMoveTarget) {
              const dx = touchMoveTarget.x - (x + PLAYER_SIZE / 2);
              const dy = touchMoveTarget.y - (y + PLAYER_SIZE / 2);
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance > PLAYER_SPEED) { moveX = dx / distance; moveY = dy / distance; }
            }
          } else {
              if (keysPressed.current['arrowup'] || keysPressed.current['w']) moveY -= 1;
              if (keysPressed.current['arrowdown'] || keysPressed.current['s']) moveY += 1;
              if (keysPressed.current['arrowleft'] || keysPressed.current['a']) moveX -= 1;
              if (keysPressed.current['arrowright'] || keysPressed.current['d']) moveX += 1;
              const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
              if (magnitude > 1) { moveX /= magnitude; moveY /= magnitude; }
          }
          if (moveX !== 0 || moveY !== 0) { lastMoveDirection.current = { x: moveX, y: moveY }; }
          x += moveX * PLAYER_SPEED; y += moveY * PLAYER_SPEED;
        }
        x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, y));
        return { pos: { x, y }, health, knockback: newKnockback };
      });

      setEnemy(prev => {
        if (!prev) return null;
        let { pos, health, knockback, type, lastAttackTime } = prev;
        let x = pos.x, y = pos.y;
        x += knockback.vx; y += knockback.vy;
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
          x += enemyDirection.current.x * ENEMY_SPEED; y += enemyDirection.current.y * ENEMY_SPEED;
          if (x <= 0 || x >= GAME_WIDTH - ENEMY_SIZE) enemyDirection.current.x *= -1;
          if (y <= 0 || y >= GAME_HEIGHT - ENEMY_SIZE) enemyDirection.current.y *= -1;
        }
        x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, x));
        y = Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, y));
        let newLastAttackTime = lastAttackTime;
        if (type === 'water' && Date.now() - (lastAttackTime || 0) > WATER_ENEMY_ATTACK_INTERVAL) {
            newLastAttackTime = Date.now();
            const projectileDirection = { ...enemyDirection.current };
            const enemyCenter = { x: x + ENEMY_SIZE / 2, y: y + ENEMY_SIZE / 2 };
            const newProjectile: WaterProjectile = { id: Math.random(), pos: enemyCenter, direction: projectileDirection, width: 0, height: PROJECTILE_THICKNESS, speed: PROJECTILE_SPEED, createdAt: Date.now() };
            setProjectiles(currentProjectiles => [...currentProjectiles, newProjectile]);
        }
        return { pos: {x, y}, health, knockback: newKnockback, type, lastAttackTime: newLastAttackTime };
      });

      setAlly(prevAlly => {
        if (!prevAlly || !enemy) return prevAlly;
        let { pos, health, knockback, spawnedAt } = prevAlly;
        let x = pos.x, y = pos.y;
        x += knockback.vx; y += knockback.vy;
        const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
        if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
        if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;
        if (newKnockback.vx === 0 && newKnockback.vy === 0) {
          const dx = enemy.pos.x - x;
          const dy = enemy.pos.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 1) {
              const moveX = (dx / distance) * ALLY_SPEED; const moveY = (dy / distance) * ALLY_SPEED;
              x += moveX; y += moveY;
          }
        }
        x = Math.max(0, Math.min(GAME_WIDTH - ALLY_SIZE, x)); y = Math.max(0, Math.min(GAME_HEIGHT - ALLY_SIZE, y));
        return { pos: {x, y}, health, knockback: newKnockback, spawnedAt };
      });

      setProjectiles(prevProjectiles =>
        prevProjectiles.map(p => {
          const age = Date.now() - p.createdAt;
          const growthRatio = Math.min(1, age / PROJECTILE_GROWTH_DURATION);
          const length = PROJECTILE_MAX_LENGTH * growthRatio;
          let newPos = p.pos;
          if (age > PROJECTILE_GROWTH_DURATION) {
            newPos = { x: p.pos.x + p.direction.x * p.speed, y: p.pos.y + p.direction.y * p.speed };
          }
          return { ...p, pos: newPos, width: length };
        }).filter(p => p.pos.x < GAME_WIDTH + p.width && p.pos.x > -p.width && p.pos.y < GAME_HEIGHT + p.width && p.pos.y > -p.width)
      );
      animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);
    return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
  }, [isMobile, GAME_WIDTH, GAME_HEIGHT, enemy, touchMoveTarget]);

  useEffect(() => {
    if (player.health <= 0) { resetGame(); return; }
    if (!enemy || !collectiblePos) return;

    if (ally && checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...ally.pos, size: ALLY_SIZE }) && Date.now() - ally.spawnedAt > ALLY_RECALL_COOLDOWN) {
        setAllyData({ health: ally.health });
        setAlly(null); return;
    }

    if (trap && checkCollision({ ...enemy.pos, size: ENEMY_SIZE }, { ...trap.pos, size: TRAP_SIZE })) {
      setTrapXp(s => s + 1);
      if (!allyAwarded) { setAllyAwarded(true); setAllyData({ health: allyMaxHealth }); }
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: 0 });
      setTrap(null); return;
    }

    if (checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...enemy.pos, size: ENEMY_SIZE })) {
      if (!playerHitCooldown.current) {
        playerHitCooldown.current = true;
        const dx = enemy.pos.x - player.pos.x, dy = enemy.pos.y - player.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const knockbackVX = (dx / distance) * KNOCKBACK_FORCE, knockbackVY = (dy / distance) * KNOCKBACK_FORCE;
        setPlayer(p => ({ ...p, health: p.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } }));
        setEnemy(e => e ? { ...e, health: e.health - 1, knockback: { vx: knockbackVX, vy: knockbackVY } } : null);
        setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
      }
    }

    if (!playerHitCooldown.current && projectiles.length > 0) {
      const playerCircle = { center: { x: player.pos.x + PLAYER_SIZE / 2, y: player.pos.y + PLAYER_SIZE / 2 }, radius: PLAYER_SIZE / 2 };
      projectiles.forEach(p => {
        const projectileCenter = { x: p.pos.x + (p.direction.x * p.width) / 2 - (p.direction.x * p.height) / 2, y: p.pos.y + (p.direction.y * p.width) / 2 - (p.direction.y * p.height) / 2 };
        const projectileRadius = p.width / 2;
        if (checkCircleCollision({ center: playerCircle.center, radius: playerCircle.radius }, { center: projectileCenter, radius: projectileRadius })) {
          playerHitCooldown.current = true;
          const knockbackVX = p.direction.x * KNOCKBACK_FORCE * 0.5, knockbackVY = p.direction.y * KNOCKBACK_FORCE * 0.5;
          setPlayer(pl => ({ ...pl, health: pl.health - 1, knockback: { vx: knockbackVX, vy: knockbackVY } }));
          setProjectiles(prev => prev.filter(proj => proj.id !== p.id));
          setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
        }
      });
    }

    if (ally && checkCollision({ ...ally.pos, size: ALLY_SIZE }, { ...enemy.pos, size: ENEMY_SIZE })) {
      if (!allyHitCooldown.current) {
        allyHitCooldown.current = true;
        const dx = enemy.pos.x - ally.pos.x, dy = enemy.pos.y - ally.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const knockbackVX = (dx / distance) * KNOCKBACK_FORCE, knockbackVY = (dy / distance) * KNOCKBACK_FORCE;
        setAlly(a => a ? { ...a, health: a.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } } : null);
        setEnemy(e => e ? { ...e, health: e.health - attackLevel, knockback: { vx: knockbackVX, vy: knockbackVY } } : null);
        setTimeout(() => { allyHitCooldown.current = false; }, HIT_COOLDOWN);
      }
    }

    if (ally && ally.health <= 0) { setAllyData({ health: 0 }); setAlly(null); }
    if (enemy.health <= 0) {
      setAttackXp(xp => xp + 1);
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: 0 });
      return;
    }

    if (checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...collectiblePos, size: COLLECTIBLE_SIZE })) {
      setTrapCount(s => s + 1);
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
    if (trap && checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...trap.pos, size: TRAP_SIZE }) && Date.now() - trap.placedAt > TRAP_PICKUP_COOLDOWN) {
      setTrapCount(c => c + 1);
      setTrap(null);
    }
  }, [player, enemy, collectiblePos, trap, ally, projectiles, resetGame, GAME_WIDTH, GAME_HEIGHT, allyAwarded, attackLevel, allyMaxHealth, enabledEnemyTypes]);

  useEffect(() => {
    if (ally || !allyData || allyData.health >= allyMaxHealth) return;
    const intervalId = setInterval(() => {
      setAllyData(d => {
        if (!d || d.health >= allyMaxHealth) { if (intervalId) clearInterval(intervalId); return d; }
        const newHealth = d.health + 1;
        if(newHealth >= allyMaxHealth) { clearInterval(intervalId); }
        return { health: newHealth };
      });
    }, ALLY_REGEN_INTERVAL);
    return () => clearInterval(intervalId);
  }, [ally, allyData, allyMaxHealth]);

  useEffect(() => {
    if (isMobile === undefined) return;
    if (enemy === null) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: 0 });
    }
    if (collectiblePos === null) {
      setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }
  }, [GAME_WIDTH, GAME_HEIGHT, enemy, collectiblePos, isMobile, enabledEnemyTypes]);
  
  return {
    gameAreaRef,
    joystickAreaRef,
    player,
    enemy,
    collectiblePos,
    trap,
    ally,
    projectiles,
    trapXp,
    trapXpTarget,
    attackXp,
    attackXpTarget,
    attackLevel,
    trapCount,
    allyData,
    isSettingsOpen,
    enabledEnemyTypes,
    handlePos,
    isDragging,
    setIsSettingsOpen,
    setEnabledEnemyTypes,
    handleGameAreaTouchStart,
    handleGameAreaTouchMove,
    handleGameAreaTouchEnd,
    handleJoystickTouchStart,
    handleJoystickTouchMove,
    handleJoystickTouchEnd,
    handlePlaceTrap,
    handleSpawnAlly,
  };
}
