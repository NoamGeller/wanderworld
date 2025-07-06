
import type { Ally, Character } from '@/components/game/types';
import { ALLY_SIZE, ALLY_SPEED, KNOCKBACK_DECAY } from '@/components/game/constants';

export function updateAlly({
    ally,
    enemy,
    GAME_WIDTH,
    GAME_HEIGHT,
}: {
    ally: Ally;
    enemy: Character;
    GAME_WIDTH: number;
    GAME_HEIGHT: number;
}): Ally {
    let { pos, health, knockback, spawnedAt } = ally;
    let x = pos.x, y = pos.y;
    
    // Apply knockback
    x += knockback.vx;
    y += knockback.vy;
    const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
    if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
    if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;

    // Apply AI movement if not being knocked back
    if (newKnockback.vx === 0 && newKnockback.vy === 0) {
        const dx = enemy.pos.x - x;
        const dy = enemy.pos.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 1) { // Stop when it reaches the enemy
            const moveX = (dx / distance) * ALLY_SPEED;
            const moveY = (dy / distance) * ALLY_SPEED;
            x += moveX;
            y += moveY;
        }
    }
    
    // Boundary checks
    x = Math.max(0, Math.min(GAME_WIDTH - ALLY_SIZE, x));
    y = Math.max(0, Math.min(GAME_HEIGHT - ALLY_SIZE, y));

    return { pos: {x, y}, health, knockback: newKnockback, spawnedAt };
}
