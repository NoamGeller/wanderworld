
import type { FC } from 'react';
import type { WaterProjectile } from './types';

type ProjectileComponentProps = {
    projectile: WaterProjectile;
};

export const ProjectileComponent: FC<ProjectileComponentProps> = ({ projectile }) => {
    const angle = Math.atan2(projectile.direction.y, projectile.direction.x) * (180 / Math.PI);
    const dropletBaseClasses = "absolute w-[3px] h-[5px] bg-[hsl(var(--chart-3))] rounded-full animate-droplet-fall";
    
    return (
        <div
            className="absolute"
            style={{
                left: projectile.pos.x,
                top: projectile.pos.y,
                width: projectile.width,
                height: projectile.height,
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'left center',
            }}
        >
            <div
                aria-label="Water Projectile"
                className="w-full h-full bg-[hsl(var(--chart-3))] rounded-sm"
            />
            {/* Droplets for visual effect. They do not affect collision. */}
            <span className={dropletBaseClasses} style={{ animationDelay: '0s', left: '20%' }} />
            <span className={dropletBaseClasses} style={{ animationDelay: '0.2s', left: '50%' }} />
            <span className={dropletBaseClasses} style={{ animationDelay: '0.4s', left: '80%' }} />
        </div>
    );
};
