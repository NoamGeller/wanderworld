
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    PLAYER_SIZE,
    ENEMY_SIZE,
    COLLECTIBLE_SIZE,
    TRAP_SIZE,
    ALLY_SIZE,
    HEALTH_START,
    ALLY_REGEN_INTERVAL,
} from '@/components/game/constants';
import type { Position, Character, Trap, Ally, EnemyType, WaterProjectile } from '@/components/game/types';
import { getRandomPosition, getRandomEnemyType } from '@/components/game/utils';

import { updatePlayer } from './player';
import { updateEnemy, updateProjectiles } from './enemy';
import { updateAlly } from './ally';
import { handleGameInteractions } from './interactions';


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
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() });
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
    const maxDistance = 50;
    const distance = Math.sqrt(dx * dx + dy * dy);
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

  // Main game loop
  useEffect(() => {
    const loop = () => {
        // Capture a snapshot of the current state from React state
        const currentState = { player, enemy, collectiblePos, trap, ally, projectiles, allyAwarded, attackLevel, allyMaxHealth, enabledEnemyTypes, touchMoveTarget };

        // Ensure the game is initialized before running logic
        if (!currentState.enemy || !currentState.collectiblePos) {
            animationFrameId.current = requestAnimationFrame(loop);
            return;
        }

        // --- UPDATE PHASE ---
        const playerUpdate = updatePlayer({
            player: currentState.player,
            keysPressed, playerDirection, touchMoveTarget, isMobile, GAME_WIDTH, GAME_HEIGHT
        });
        if (playerUpdate.lastMoveDirection) {
            lastMoveDirection.current = playerUpdate.lastMoveDirection;
        }

        let newEnemyProjectiles = [...currentState.projectiles];
        const enemyUpdate = updateEnemy({
            enemy: currentState.enemy,
            player: playerUpdate.newPlayer,
            ally: currentState.ally,
            enemyDirection,
            enemyDirectionChangeCounter,
            setProjectiles: (updater) => {
                if (typeof updater === 'function') {
                    newEnemyProjectiles = updater(newEnemyProjectiles);
                } else {
                    newEnemyProjectiles = updater;
                }
            },
            GAME_WIDTH, GAME_HEIGHT
        });
        
        const allyUpdate = currentState.ally ? updateAlly({
            ally: currentState.ally,
            enemy: enemyUpdate,
            GAME_WIDTH, GAME_HEIGHT
        }) : null;
        
        const projectileUpdate = updateProjectiles(newEnemyProjectiles, GAME_WIDTH, GAME_HEIGHT);
        
        // --- INTERACTION PHASE ---
        const interactionResult = handleGameInteractions({
            player: playerUpdate.newPlayer,
            enemy: enemyUpdate,
            collectiblePos: currentState.collectiblePos,
            trap: currentState.trap,
            ally: allyUpdate,
            projectiles: projectileUpdate,
            allyAwarded: currentState.allyAwarded,
            attackLevel, allyMaxHealth, enabledEnemyTypes,
            playerHitCooldown, allyHitCooldown,
            GAME_WIDTH, GAME_HEIGHT
        });

        // --- COMMIT PHASE ---
        if (interactionResult.shouldReset) {
            resetGame();
        } else {
            setPlayer(interactionResult.nextPlayer);
            setEnemy(interactionResult.nextEnemy);
            setCollectiblePos(interactionResult.nextCollectiblePos);
            setTrap(interactionResult.nextTrap);
            setAlly(interactionResult.nextAlly);
            setProjectiles(interactionResult.nextProjectiles);
            setAllyAwarded(interactionResult.allyAwarded);
            
            if (interactionResult.nextAllyData) {
                setAllyData(interactionResult.nextAllyData);
            }
            if (interactionResult.trapXpGained > 0) {
                setTrapXp(xp => xp + interactionResult.trapXpGained);
            }
            if (interactionResult.attackXpGained > 0) {
                setAttackXp(xp => xp + interactionResult.attackXpGained);
            }
            if (interactionResult.trapCountGained > 0) {
                setTrapCount(c => c + interactionResult.trapCountGained);
            }
        }
        
        animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => { 
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [isMobile, GAME_WIDTH, GAME_HEIGHT, resetGame, player, enemy, collectiblePos, trap, ally, projectiles, allyAwarded, attackLevel, allyMaxHealth, enabledEnemyTypes, touchMoveTarget]);


  // Ally regeneration logic
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

  // Initial spawn logic
  useEffect(() => {
    if (isMobile === undefined) return;
    if (enemy === null) {
      setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() });
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
