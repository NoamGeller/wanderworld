
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

// Circle-based collision for more dynamic checks
export const checkCircleCollision = (
  circle1: { center: Position; radius: number },
  circle2: { center: Position; radius: number }
) => {
  const dx = circle1.center.x - circle2.center.x;
  const dy = circle1.center.y - circle2.center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < circle1.radius + circle2.radius;
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
