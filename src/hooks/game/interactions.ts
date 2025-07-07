
import { checkCollision, getRandomPosition, getRandomEnemyType, checkCircleCollision } from '@/components/game/utils';
import type { Character, Trap, Ally, WaterProjectile, EnemyType, Position } from '@/components/game/types';
import { PLAYER_SIZE, ENEMY_SIZE, COLLECTIBLE_SIZE, TRAP_SIZE, ALLY_SIZE, HEALTH_START, KNOCKBACK_FORCE, HIT_COOLDOWN, ALLY_RECALL_COOLDOWN, TRAP_PICKUP_COOLDOWN } from '@/components/game/constants';

type InteractionHandlerProps = {
    // State
    player: Character;
    enemy: Character;
    collectiblePos: Position;
    trap: Trap | null;
    ally: Ally | null;
    projectiles: WaterProjectile[];
    allyAwarded: boolean;
    attackLevel: number;
    allyMaxHealth: number;
    enabledEnemyTypes: EnemyType[];
    
    // Refs
    playerHitCooldown: React.MutableRefObject<boolean>;
    allyHitCooldown: React.MutableRefObject<boolean>;

    // Dimensions
    GAME_WIDTH: number;
    GAME_HEIGHT: number;
};

type InteractionResult = {
    nextPlayer: Character;
    nextEnemy: Character | null;
    nextCollectiblePos: Position | null;
    nextTrap: Trap | null;
    nextAlly: Ally | null;
    nextProjectiles: WaterProjectile[];
    nextAllyData: { health: number } | null;
    trapXpGained: number;
    attackXpGained: number;
    allyAwarded: boolean;
    trapCountGained: number;
    shouldReset: boolean;
};


export function handleGameInteractions({
    player, enemy, collectiblePos, trap, ally, projectiles, allyAwarded, attackLevel, allyMaxHealth, enabledEnemyTypes,
    playerHitCooldown, allyHitCooldown,
    GAME_WIDTH, GAME_HEIGHT,
}: InteractionHandlerProps): InteractionResult {

    let nextPlayer = { ...player };
    let nextEnemy: Character | null = enemy ? { ...enemy } : null;
    let nextCollectiblePos = collectiblePos ? { ...collectiblePos } : null;
    let nextTrap = trap ? { ...trap } : null;
    let nextAlly = ally ? { ...ally } : null;
    let nextProjectiles = [...projectiles];
    let nextAllyData = null; // This will be set if ally is recalled or dies
    let trapXpGained = 0;
    let attackXpGained = 0;
    let trapCountGained = 0;
    let nextAllyAwarded = allyAwarded;

    if (nextPlayer.health <= 0) {
        return { shouldReset: true, nextPlayer, nextEnemy, nextCollectiblePos, nextTrap, nextAlly, nextProjectiles, nextAllyData, trapXpGained, attackXpGained, allyAwarded: nextAllyAwarded, trapCountGained };
    }
    
    if (!nextEnemy || !nextCollectiblePos) {
        return { shouldReset: false, nextPlayer, nextEnemy, nextCollectiblePos, nextTrap, nextAlly, nextProjectiles, nextAllyData, trapXpGained, attackXpGained, allyAwarded: nextAllyAwarded, trapCountGained };
    }

    // Player-Ally collision (for recalling ally)
    if (nextAlly && checkCollision({ ...nextPlayer.pos, size: PLAYER_SIZE }, { ...nextAlly.pos, size: ALLY_SIZE }) && Date.now() - nextAlly.spawnedAt > ALLY_RECALL_COOLDOWN) {
        nextAllyData = { health: nextAlly.health };
        nextAlly = null;
        return { shouldReset: false, nextPlayer, nextEnemy, nextCollectiblePos, nextTrap, nextAlly, nextProjectiles, nextAllyData, trapXpGained, attackXpGained, allyAwarded: nextAllyAwarded, trapCountGained };
    }

    // Trap-Enemy collision
    if (nextTrap && checkCollision({ ...nextEnemy.pos, size: ENEMY_SIZE }, { ...nextTrap.pos, size: TRAP_SIZE })) {
        trapXpGained += 1;
        if (!nextAllyAwarded) {
            nextAllyAwarded = true;
            nextAllyData = { health: allyMaxHealth };
        }
        nextEnemy = { pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() };
        nextTrap = null;
        return { shouldReset: false, nextPlayer, nextEnemy, nextCollectiblePos, nextTrap, nextAlly, nextProjectiles, nextAllyData, trapXpGained, attackXpGained, allyAwarded: nextAllyAwarded, trapCountGained };
    }

    // Player-Enemy collision
    if (checkCollision({ ...nextPlayer.pos, size: PLAYER_SIZE }, { ...nextEnemy.pos, size: ENEMY_SIZE })) {
        if (!playerHitCooldown.current) {
            playerHitCooldown.current = true;
            const dx = nextEnemy.pos.x - nextPlayer.pos.x, dy = nextEnemy.pos.y - nextPlayer.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const knockbackVX = (dx / distance) * KNOCKBACK_FORCE;
            const knockbackVY = (dy / distance) * KNOCKBACK_FORCE;
            
            nextPlayer = { ...nextPlayer, health: nextPlayer.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } };
            
            const newEnemyHealth = nextEnemy.health - 1;
            if (newEnemyHealth <= 0) {
                attackXpGained += 1;
                nextEnemy = { pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() };
            } else {
                nextEnemy = { ...nextEnemy, health: newEnemyHealth, knockback: { vx: knockbackVX, vy: knockbackVY } };
            }
            setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
        }
    }

    // Projectile-Player collision
    if (!playerHitCooldown.current && nextProjectiles.length > 0) {
        const playerCircle = { center: { x: nextPlayer.pos.x + PLAYER_SIZE / 2, y: nextPlayer.pos.y + PLAYER_SIZE / 2 }, radius: PLAYER_SIZE / 2 };
        for (const p of nextProjectiles) {
            const projectileCenter = { x: p.pos.x + (p.direction.x * p.width) / 2 - (p.direction.x * p.height) / 2, y: p.pos.y + (p.direction.y * p.width) / 2 - (p.direction.y * p.height) / 2 };
            const projectileRadius = p.width / 2;

            if (checkCircleCollision({ center: playerCircle.center, radius: playerCircle.radius }, { center: projectileCenter, radius: projectileRadius })) {
                playerHitCooldown.current = true;
                const knockbackVX = p.direction.x * KNOCKBACK_FORCE * 0.5;
                const knockbackVY = p.direction.y * KNOCKBACK_FORCE * 0.5;
                nextPlayer = ({ ...nextPlayer, health: nextPlayer.health - 1, knockback: { vx: knockbackVX, vy: knockbackVY } });
                nextProjectiles = nextProjectiles.filter(proj => proj.id !== p.id);
                setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
                break; // Exit loop after first hit
            }
        }
    }

    // Ally-Enemy collision
    if (nextAlly && nextEnemy && checkCollision({ ...nextAlly.pos, size: ALLY_SIZE }, { ...nextEnemy.pos, size: ENEMY_SIZE })) {
        if (!allyHitCooldown.current) {
            allyHitCooldown.current = true;
            const dx = nextEnemy.pos.x - nextAlly.pos.x, dy = nextEnemy.pos.y - nextAlly.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const knockbackVX = (dx / distance) * KNOCKBACK_FORCE;
            const knockbackVY = (dy / distance) * KNOCKBACK_FORCE;

            nextAlly = { ...nextAlly, health: nextAlly.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } };
            
            const newEnemyHealth = nextEnemy.health - attackLevel;
            if (newEnemyHealth <= 0) {
                attackXpGained += 1;
                nextEnemy = { pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() };
            } else {
                nextEnemy = { ...nextEnemy, health: newEnemyHealth, knockback: { vx: knockbackVX, vy: knockbackVY } };
            }
            setTimeout(() => { allyHitCooldown.current = false; }, HIT_COOLDOWN);
        }
    }

    // Check for character deaths
    if (nextAlly && nextAlly.health <= 0) {
        nextAllyData = { health: 0 };
        nextAlly = null;
    }
    
    // Player-Collectible collision
    if (nextCollectiblePos && checkCollision({ ...nextPlayer.pos, size: PLAYER_SIZE }, { ...nextCollectiblePos, size: COLLECTIBLE_SIZE })) {
        trapCountGained += 1;
        nextCollectiblePos = getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT);
    }

    // Player picking up their own trap
    if (nextTrap && checkCollision({ ...nextPlayer.pos, size: PLAYER_SIZE }, { ...nextTrap.pos, size: TRAP_SIZE }) && Date.now() - nextTrap.placedAt > TRAP_PICKUP_COOLDOWN) {
        trapCountGained += 1;
        nextTrap = null;
    }
    
    return { shouldReset: false, nextPlayer, nextEnemy, nextCollectiblePos, nextTrap, nextAlly, nextProjectiles, nextAllyData, trapXpGained, attackXpGained, allyAwarded: nextAllyAwarded, trapCountGained };
}
