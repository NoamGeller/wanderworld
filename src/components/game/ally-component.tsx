
import type { FC } from 'react';
import { Heart, Sword } from 'lucide-react';
import type { Ally } from './types';
import { ALLY_SIZE } from './constants';

type AllyComponentProps = {
    ally: Ally;
    attackLevel: number;
};

export const AllyComponent: FC<AllyComponentProps> = ({ ally, attackLevel }) => {
    return (
         <div className="absolute" style={{ width: ALLY_SIZE, height: ALLY_SIZE, left: ally.pos.x, top: ally.pos.y }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 select-none whitespace-nowrap">
                <div className="flex items-center gap-1 bg-card/80 px-1.5 py-0.5 rounded-md">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span className="text-xs font-bold text-foreground">{ally.health}</span>
                </div>
                <div className="flex items-center gap-1 bg-card/80 px-1.5 py-0.5 rounded-md">
                    <Sword className="w-3 h-3 text-gray-600 fill-gray-400" />
                    <span className="text-xs font-bold text-foreground">{attackLevel}</span>
                </div>
            </div>
            <div aria-label="Ally" className="w-full h-full bg-[hsl(var(--chart-2))] rounded-full" />
        </div>
    );
};
