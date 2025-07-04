
import type { Position, EnemyType } from './types';

// Helper function for collision detection
export const checkCollision = (rect1: Position & { size: number }, rect2: Position & { size: number }) => {
  return (
    rect1.x < rect2.x + rect2.size &&
    rect1.x + rect1.size > rect2.x &&
    rect1.y < rect2.y + rect2.size &&
    rect1.y + rect1.size > rect2.y
  );
};

// Helper function to get a random position
export const getRandomPosition = (size: number, width: number, height: number): Position => {
  return {
    x: Math.random() * (width - size),
    y: Math.random() * (height - size),
  };
};

const enemyTypes: EnemyType[] = ['fire', 'water', 'earth', 'air'];
export const getRandomEnemyType = (): EnemyType => {
  return enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
};
