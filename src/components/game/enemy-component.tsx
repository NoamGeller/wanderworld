
import type { FC } from 'react';
import { Heart } from 'lucide-react';
import type { Character } from './types';
import { ENEMY_SIZE } from './constants';

type EnemyComponentProps = {
    enemy: Character;
};

export const EnemyComponent: FC<EnemyComponentProps> = ({ enemy }) => {
    return (
        <div className="absolute" style={{ width: ENEMY_SIZE, height: ENEMY_SIZE, left: enemy.pos.x, top: enemy.pos.y }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 select-none whitespace-nowrap bg-card/80 px-1.5 py-0.5 rounded-md">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="text-xs font-bold text-foreground">{enemy.health}</span>
            </div>
            <div aria-label="Enemy" className="w-full h-full bg-destructive rounded-full" />
        </div>
    );
};
