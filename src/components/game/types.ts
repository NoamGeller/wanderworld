
export type Position = {
  x: number;
  y: number;
};

export type Knockback = {
  vx: number;
  vy: number;
};

export type EnemyType = 'fire' | 'water' | 'earth' | 'air';

export type Character = {
  pos: Position;
  health: number;
  knockback: Knockback;
  type?: EnemyType;
  lastAttackTime?: number;
};

export type Trap = {
    pos: Position;
    placedAt: number;
};

export type Ally = Character & {
    spawnedAt: number;
};

export type WaterProjectile = {
  id: number;
  pos: Position;
  direction: Position;
  width: number;
  height: number;
  speed: number;
  createdAt: number;
};
