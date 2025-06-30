
import type { FC } from 'react';
import { Heart } from 'lucide-react';
import type { Character } from './types';
import { PLAYER_SIZE } from './constants';

type PlayerComponentProps = {
    player: Character;
};

export const PlayerComponent: FC<PlayerComponentProps> = ({ player }) => {
    return (
        <div className="absolute" style={{ width: PLAYER_SIZE, height: PLAYER_SIZE, left: player.pos.x, top: player.pos.y }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 select-none whitespace-nowrap">
                <div className="flex items-center gap-1 bg-card/80 px-1.5 py-0.5 rounded-md">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span className="text-xs font-bold text-foreground">{player.health}</span>
                </div>
            </div>
            <div aria-label="Player" className="w-full h-full bg-primary rounded-full" />
        </div>
    );
};
