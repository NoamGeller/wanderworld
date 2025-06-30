
import type { FC } from 'react';
import type { Position } from './types';
import { TRAP_SIZE } from './constants';

type TrapComponentProps = {
    position: Position;
};

export const TrapComponent: FC<TrapComponentProps> = ({ position }) => {
    return (
        <div
            aria-label="Trap"
            className="absolute bg-transparent border-2 border-dashed border-destructive/80 rounded-full"
            style={{
                width: TRAP_SIZE,
                height: TRAP_SIZE,
                left: position.x,
                top: position.y,
            }}
        />
    );
};
