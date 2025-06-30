
export type Position = {
  x: number;
  y: number;
};

export type Knockback = {
  vx: number;
  vy: number;
};

export type Character = {
  pos: Position;
  health: number;
  knockback: Knockback;
};

export type Trap = {
    pos: Position;
    placedAt: number;
};

export type Ally = Character & {
    spawnedAt: number;
};
