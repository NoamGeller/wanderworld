
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
    
    // Setters
    setPlayer: React.Dispatch<React.SetStateAction<Character>>;
    setEnemy: React.Dispatch<React.SetStateAction<Character | null>>;
    setCollectiblePos: React.Dispatch<React.SetStateAction<Position | null>>;
    setTrap: React.Dispatch<React.SetStateAction<Trap | null>>;
    setAlly: React.Dispatch<React.SetStateAction<Ally | null>>;
    setProjectiles: React.Dispatch<React.SetStateAction<WaterProjectile[]>>;
    setAllyData: React.Dispatch<React.SetStateAction<{ health: number } | null>>;
    setTrapXp: React.Dispatch<React.SetStateAction<number>>;
    setAttackXp: React.Dispatch<React.SetStateAction<number>>;
    setAllyAwarded: React.Dispatch<React.SetStateAction<boolean>>;
    setTrapCount: React.Dispatch<React.SetStateAction<number>>;

    // Refs
    playerHitCooldown: React.MutableRefObject<boolean>;
    allyHitCooldown: React.MutableRefObject<boolean>;

    // Dimensions
    GAME_WIDTH: number;
    GAME_HEIGHT: number;

    // Reset function
    resetGame: () => void;
};


export function handleGameInteractions({
    player, enemy, collectiblePos, trap, ally, projectiles, allyAwarded, attackLevel, allyMaxHealth, enabledEnemyTypes,
    setPlayer, setEnemy, setCollectiblePos, setTrap, setAlly, setProjectiles, setAllyData, setTrapXp, setAttackXp, setAllyAwarded, setTrapCount,
    playerHitCooldown, allyHitCooldown,
    GAME_WIDTH, GAME_HEIGHT,
    resetGame,
}: InteractionHandlerProps) {

    if (player.health <= 0) {
        resetGame();
        return;
    }

    if (!enemy || !collectiblePos) return;

    // Player-Ally collision (for recalling ally)
    if (ally && checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...ally.pos, size: ALLY_SIZE }) && Date.now() - ally.spawnedAt > ALLY_RECALL_COOLDOWN) {
        setAllyData({ health: ally.health });
        setAlly(null);
        return; // Early exit to prevent other interactions in the same frame
    }

    // Trap-Enemy collision
    if (trap && checkCollision({ ...enemy.pos, size: ENEMY_SIZE }, { ...trap.pos, size: TRAP_SIZE })) {
        setTrapXp(s => s + 1);
        if (!allyAwarded) {
            setAllyAwarded(true);
            setAllyData({ health: allyMaxHealth });
        }
        setEnemy({ pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() });
        setTrap(null);
        return;
    }

    // Player-Enemy collision
    if (checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...enemy.pos, size: ENEMY_SIZE })) {
        if (!playerHitCooldown.current) {
            playerHitCooldown.current = true;
            const dx = enemy.pos.x - player.pos.x, dy = enemy.pos.y - player.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const knockbackVX = (dx / distance) * KNOCKBACK_FORCE;
            const knockbackVY = (dy / distance) * KNOCKBACK_FORCE;
            
            setPlayer(p => ({ ...p, health: p.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } }));
            
            setEnemy(e => {
                if (!e) return null;
                const newHealth = e.health - 1;
                if (newHealth <= 0) {
                    setAttackXp(xp => xp + 1);
                    return { pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() };
                }
                return { ...e, health: newHealth, knockback: { vx: knockbackVX, vy: knockbackVY } };
            });

            setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
        }
    }

    // Projectile-Player collision
    if (!playerHitCooldown.current && projectiles.length > 0) {
        const playerCircle = { center: { x: player.pos.x + PLAYER_SIZE / 2, y: player.pos.y + PLAYER_SIZE / 2 }, radius: PLAYER_SIZE / 2 };
        for (const p of projectiles) {
            const projectileCenter = { x: p.pos.x + (p.direction.x * p.width) / 2 - (p.direction.x * p.height) / 2, y: p.pos.y + (p.direction.y * p.width) / 2 - (p.direction.y * p.height) / 2 };
            const projectileRadius = p.width / 2;

            if (checkCircleCollision({ center: playerCircle.center, radius: playerCircle.radius }, { center: projectileCenter, radius: projectileRadius })) {
                playerHitCooldown.current = true;
                const knockbackVX = p.direction.x * KNOCKBACK_FORCE * 0.5;
                const knockbackVY = p.direction.y * KNOCKBACK_FORCE * 0.5;
                setPlayer(pl => ({ ...pl, health: pl.health - 1, knockback: { vx: knockbackVX, vy: knockbackVY } }));
                setProjectiles(prev => prev.filter(proj => proj.id !== p.id));
                setTimeout(() => { playerHitCooldown.current = false; }, HIT_COOLDOWN);
                break; // Exit loop after first hit
            }
        }
    }

    // Ally-Enemy collision
    if (ally && checkCollision({ ...ally.pos, size: ALLY_SIZE }, { ...enemy.pos, size: ENEMY_SIZE })) {
        if (!allyHitCooldown.current) {
            allyHitCooldown.current = true;
            const dx = enemy.pos.x - ally.pos.x, dy = enemy.pos.y - ally.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const knockbackVX = (dx / distance) * KNOCKBACK_FORCE;
            const knockbackVY = (dy / distance) * KNOCKBACK_FORCE;

            setAlly(a => a ? { ...a, health: a.health - 1, knockback: { vx: -knockbackVX, vy: -knockbackVY } } : null);
            
            setEnemy(e => {
                if (!e) return null;
                const newHealth = e.health - attackLevel;
                if (newHealth <= 0) {
                    setAttackXp(xp => xp + 1);
                    return { pos: getRandomPosition(ENEMY_SIZE, GAME_WIDTH, GAME_HEIGHT), health: HEALTH_START, knockback: { vx: 0, vy: 0 }, type: getRandomEnemyType(enabledEnemyTypes), lastAttackTime: Date.now() };
                }
                return { ...e, health: newHealth, knockback: { vx: knockbackVX, vy: knockbackVY } };
            });

            setTimeout(() => { allyHitCooldown.current = false; }, HIT_COOLDOWN);
        }
    }

    // Check for character deaths
    if (ally && ally.health <= 0) {
        setAllyData({ health: 0 });
        setAlly(null);
    }
    
    // Player-Collectible collision
    if (checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...collectiblePos, size: COLLECTIBLE_SIZE })) {
        setTrapCount(s => s + 1);
        setCollectiblePos(getRandomPosition(COLLECTIBLE_SIZE, GAME_WIDTH, GAME_HEIGHT));
    }

    // Player picking up their own trap
    if (trap && checkCollision({ ...player.pos, size: PLAYER_SIZE }, { ...trap.pos, size: TRAP_SIZE }) && Date.now() - trap.placedAt > TRAP_PICKUP_COOLDOWN) {
        setTrapCount(c => c + 1);
        setTrap(null);
    }
}
