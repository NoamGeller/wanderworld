
import type { Ally, Character, Position, WaterProjectile } from '@/components/game/types';
import { ENEMY_SIZE, ENEMY_SPEED, ENEMY_DIRECTION_CHANGE_INTERVAL, KNOCKBACK_DECAY, WATER_ENEMY_ATTACK_INTERVAL, PROJECTILE_SPEED, PROJECTILE_THICKNESS, PROJECTILE_GROWTH_DURATION, PROJECTILE_MAX_LENGTH } from '@/components/game/constants';

export function updateEnemy({
    enemy,
    player,
    ally,
    enemyDirection,
    enemyDirectionChangeCounter,
    setProjectiles,
    GAME_WIDTH,
    GAME_HEIGHT,
}: {
    enemy: Character;
    player: Character;
    ally: Ally | null;
    enemyDirection: React.MutableRefObject<Position>;
    enemyDirectionChangeCounter: React.MutableRefObject<number>;
    setProjectiles: React.Dispatch<React.SetStateAction<WaterProjectile[]>>;
    GAME_WIDTH: number;
    GAME_HEIGHT: number;
}): Character {
    let { pos, health, knockback, type, lastAttackTime } = enemy;
    let x = pos.x, y = pos.y;
    let newLastAttackTime = lastAttackTime;

    // Apply knockback
    x += knockback.vx;
    y += knockback.vy;
    const newKnockback = { vx: knockback.vx * KNOCKBACK_DECAY, vy: knockback.vy * KNOCKBACK_DECAY };
    if (Math.abs(newKnockback.vx) < 0.1) newKnockback.vx = 0;
    if (Math.abs(newKnockback.vy) < 0.1) newKnockback.vy = 0;

    // Water enemy attack logic: check if it's time to fire
    if (type === 'water' && Date.now() - (lastAttackTime || 0) > WATER_ENEMY_ATTACK_INTERVAL) {
        newLastAttackTime = Date.now();

        // Choose a target: player or ally (if ally exists)
        const targets = [player];
        if (ally) {
            targets.push(ally);
        }
        const target = targets[Math.floor(Math.random() * targets.length)];

        // Calculate direction to target
        const dx = target.pos.x - x;
        const dy = target.pos.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const projectileDirection = { x: dx / distance, y: dy / distance };
        
        const enemyCenter = { x: x + ENEMY_SIZE / 2, y: y + ENEMY_SIZE / 2 };
        const newProjectile: WaterProjectile = { id: Math.random(), pos: enemyCenter, direction: projectileDirection, width: 0, height: PROJECTILE_THICKNESS, speed: PROJECTILE_SPEED, createdAt: Date.now() };
        setProjectiles(currentProjectiles => [...currentProjectiles, newProjectile]);
    }
    
    // Determine if the enemy is in the "shooting" animation phase
    const isShooting = type === 'water' && Date.now() - (newLastAttackTime || 0) < PROJECTILE_GROWTH_DURATION;

    // Apply AI movement if not being knocked back and not shooting
    if (newKnockback.vx === 0 && newKnockback.vy === 0 && !isShooting) {
        if (enemyDirectionChangeCounter.current <= 0) {
            const angle = Math.random() * 2 * Math.PI;
            enemyDirection.current = { x: Math.cos(angle), y: Math.sin(angle) };
            enemyDirectionChangeCounter.current = ENEMY_DIRECTION_CHANGE_INTERVAL;
        } else {
            enemyDirectionChangeCounter.current--;
        }

        x += enemyDirection.current.x * ENEMY_SPEED;
        y += enemyDirection.current.y * ENEMY_SPEED;

        // Wall collision
        if (x <= 0 || x >= GAME_WIDTH - ENEMY_SIZE) enemyDirection.current.x *= -1;
        if (y <= 0 || y >= GAME_HEIGHT - ENEMY_SIZE) enemyDirection.current.y *= -1;
    }
    
    // Boundary checks
    x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, x));
    y = Math.max(0, Math.min(GAME_HEIGHT - ENEMY_SIZE, y));
    
    return { pos: {x, y}, health, knockback: newKnockback, type, lastAttackTime: newLastAttackTime };
}


export function updateProjectiles(
    projectiles: WaterProjectile[],
    GAME_WIDTH: number,
    GAME_HEIGHT: number
): WaterProjectile[] {
    return projectiles.map(p => {
        const age = Date.now() - p.createdAt;
        const growthRatio = Math.min(1, age / PROJECTILE_GROWTH_DURATION);
        const length = PROJECTILE_MAX_LENGTH * growthRatio;
        
        let newPos = p.pos;
        // Only start moving after it has grown
        if (age > PROJECTILE_GROWTH_DURATION) {
            newPos = { x: p.pos.x + p.direction.x * p.speed, y: p.pos.y + p.direction.y * p.speed };
        }
        
        return { ...p, pos: newPos, width: length };
    }).filter(p => 
        p.pos.x < GAME_WIDTH + p.width && 
        p.pos.x > -p.width && 
        p.pos.y < GAME_HEIGHT + p.width && 
        p.pos.y > -p.width
    );
}
