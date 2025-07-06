
import type { FC } from 'react';
import type { WaterProjectile } from './types';

type ProjectileComponentProps = {
    projectile: WaterProjectile;
};

export const ProjectileComponent: FC<ProjectileComponentProps> = ({ projectile }) => {
    const angle = Math.atan2(projectile.direction.y, projectile.direction.x) * (180 / Math.PI);
    
    return (
        <div
          aria-label="Water Projectile"
          className="absolute bg-[hsl(var(--chart-3))]"
          style={{
            left: projectile.pos.x,
            top: projectile.pos.y,
            width: projectile.width,
            height: projectile.height,
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'left center',
            borderRadius: '2px',
          }}
        />
    );
};
