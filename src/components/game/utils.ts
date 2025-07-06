
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

export const getRandomEnemyType = (availableTypes: EnemyType[]): EnemyType => {
  if (availableTypes.length === 0) {
    // Fallback to a default type if the array is empty, though UI should prevent this.
    return 'fire';
  }
  return availableTypes[Math.floor(Math.random() * availableTypes.length)];
};
