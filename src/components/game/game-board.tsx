
"use client";

import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';

import {
    DESKTOP_GAME_WIDTH,
    DESKTOP_GAME_HEIGHT,
    MOBILE_GAME_WIDTH,
    MOBILE_GAME_HEIGHT,
} from './constants';
import { useGameEngine } from '@/hooks/game/useGameEngine';
import { PlayerComponent } from './player-component';
import { EnemyComponent } from './enemy-component';
import { CollectibleComponent } from './collectible-component';
import { TrapComponent } from './trap-component';
import { AllyComponent } from './ally-component';
import { ProjectileComponent } from './projectile-component';
import { SettingsMenu } from './settings-menu';
import { MobileControls } from './mobile-controls';

export function GameBoard() {
  const isMobile = useIsMobile();
  const GAME_WIDTH = isMobile ? MOBILE_GAME_WIDTH : DESKTOP_GAME_WIDTH;
  const GAME_HEIGHT = isMobile ? MOBILE_GAME_HEIGHT : DESKTOP_GAME_HEIGHT;

  const {
    // Refs
    gameAreaRef,
    joystickAreaRef,
    // State
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
    // Setters
    setIsSettingsOpen,
    setEnabledEnemyTypes,
    // Handlers
    handleGameAreaTouchStart,
    handleGameAreaTouchMove,
    handleGameAreaTouchEnd,
    handleJoystickTouchStart,
    handleJoystickTouchMove,
    handleJoystickTouchEnd,
    handlePlaceTrap,
    handleSpawnAlly
  } = useGameEngine({ GAME_WIDTH, GAME_HEIGHT, isMobile });
  
  if (isMobile === undefined) {
    return null;
  }

  return (
    <Card className="w-auto border-4 border-primary/20 shadow-2xl bg-card">
      <CardContent className="p-0">
        <div className="flex justify-between items-center bg-primary/10 p-2 border-b-2 border-primary/20">
            <div className="flex gap-4">
                <h2 className="text-base font-semibold text-primary font-sans">Trap XP: {trapXp}/{trapXpTarget}</h2>
                <h2 className="text-base font-semibold text-primary font-sans">Attack XP: {attackXp}/{attackXpTarget}</h2>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsSettingsOpen(true)}
            >
                <Cog className="h-5 w-5 text-primary" />
                <span className="sr-only">Open Settings</span>
            </Button>
        </div>
        <div
          ref={gameAreaRef}
          className="relative overflow-hidden touch-none"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'hsl(var(--background))' }}
          onTouchStart={handleGameAreaTouchStart}
          onTouchMove={handleGameAreaTouchMove}
          onTouchEnd={handleGameAreaTouchEnd}
          onTouchCancel={handleGameAreaTouchEnd}
        >
          <PlayerComponent player={player} />
          {enemy && <EnemyComponent enemy={enemy} />}
          {collectiblePos && <CollectibleComponent position={collectiblePos} />}
          {trap && <TrapComponent position={trap.pos} />}
          {ally && <AllyComponent ally={ally} attackLevel={attackLevel} />}
          {projectiles.map(p => <ProjectileComponent key={p.id} projectile={p} />)}
        </div>
         <SettingsMenu
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            enabledTypes={enabledEnemyTypes}
            onEnabledTypesChange={setEnabledEnemyTypes}
        />
        {isMobile && (
            <MobileControls
                joystickAreaRef={joystickAreaRef}
                handleTouchStart={handleJoystickTouchStart}
                handleTouchMove={handleJoystickTouchMove}
                handleTouchEnd={handleJoystickTouchEnd}
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
