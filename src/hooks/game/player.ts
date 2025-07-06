
import type { Character, Position } from '@/components/game/types';
import { PLAYER_SIZE, PLAYER_SPEED, KNOCKBACK_DECAY } from '@/components/game/constants';

export function updatePlayer({
    player,
    keysPressed,
    playerDirection,
    touchMoveTarget,
    isMobile,
    GAME_WIDTH,
    GAME_HEIGHT,
}: {
    player: Character;
    keysPressed: React.MutableRefObject<{ [key: string]: boolean }>;
    playerDirection: React.MutableRefObject<Position>;
    touchMoveTarget: Position | null;
    isMobile: boolean | undefined;
    GAME_WIDTH: number;
    GAME_HEIGHT: number;
}): { newPlayer: Character, lastMoveDirection: Position | null } {
    let { pos, health, knockback } = player;
    let x = pos.x, y = pos.y;
    let updatedLastMoveDirection: Position | null = null;

    // Apply knockback
    x += knockback.vx;
    y += knockback.vy;
    const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
    if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
    if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;

    // Apply movement if not being knocked back
    if (newKnockback.vx === 0 && newKnockback.vy === 0) {
        let moveX = 0, moveY = 0;
        if (isMobile) {
            if (playerDirection.current.x !== 0 || playerDirection.current.y !== 0) {
                // Joystick movement
                moveX = playerDirection.current.x;
                moveY = playerDirection.current.y;
            } else if (touchMoveTarget) {
                // Touch-to-move movement
                const dx = touchMoveTarget.x - (x + PLAYER_SIZE / 2);
                const dy = touchMoveTarget.y - (y + PLAYER_SIZE / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > PLAYER_SPEED) {
                    moveX = dx / distance;
                    moveY = dy / distance;
                }
            }
        } else {
            // Keyboard movement
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
            updatedLastMoveDirection = { x: moveX, y: moveY };
        }

        x += moveX * PLAYER_SPEED;
        y += moveY * PLAYER_SPEED;
    }

    // Boundary checks
    x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, x));
    y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, y));

    return {
        newPlayer: { pos: { x, y }, health, knockback: newKnockback },
        lastMoveDirection: updatedLastMoveDirection,
    };
}
