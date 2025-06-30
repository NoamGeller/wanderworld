
import type { FC } from 'react';
import { Heart } from 'lucide-react';
import {
    JOYSTICK_AREA_HEIGHT,
    JOYSTICK_BASE_RADIUS,
    JOYSTICK_HANDLE_RADIUS,
    ACTION_BUTTON_SIZE,
    COLLECTIBLE_SIZE,
    ALLY_SIZE
} from './constants';
import type { Trap, Ally } from './types';


type MobileControlsProps = {
    joystickAreaRef: React.RefObject<HTMLDivElement>;
    handleTouchStart: (e: React.TouchEvent) => void;
    handleTouchMove: (e: React.TouchEvent) => void;
    handleTouchEnd: (e: React.TouchEvent) => void;
    handlePos: { x: number; y: number };
    isDragging: boolean;
    handlePlaceTrap: () => void;
    trapCount: number;
    trap: Trap | null;
    handleSpawnAlly: () => void;
    allyData: { health: number } | null;
    ally: Ally | null;
};

export const MobileControls: FC<MobileControlsProps> = ({
    joystickAreaRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePos,
    isDragging,
    handlePlaceTrap,
    trapCount,
    trap,
    handleSpawnAlly,
    allyData,
    ally,
}) => {
    return (
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
                disabled={!allyData || !!ally || allyData.health <= 0}
                className="relative flex items-center justify-center rounded-full bg-secondary disabled:bg-muted disabled:opacity-50 transition-colors"
                style={{ width: ACTION_BUTTON_SIZE, height: ACTION_BUTTON_SIZE }}
                aria-label="Spawn Ally"
            >
                {allyData && !ally && (
                    <>
                        <div
                            className="bg-[hsl(var(--chart-2))] rounded-full"
                            style={{
                                width: ALLY_SIZE * 1.5,
                                height: ALLY_SIZE * 1.5,
                            }}
                        />
                        {allyData.health > 0 && (
                            <div className="absolute -top-1 -left-1 flex items-center gap-1 select-none whitespace-nowrap bg-card px-1 rounded-full border-2 border-border text-xs">
                                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                <span className="font-bold text-foreground">{allyData.health}</span>
                            </div>
                        )}
                    </>
                )}
            </button>
        </div>
    );
};
