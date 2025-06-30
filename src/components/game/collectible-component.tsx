
import type { FC } from 'react';
import type { Position } from './types';
import { COLLECTIBLE_SIZE } from './constants';

type CollectibleComponentProps = {
    position: Position;
};

export const CollectibleComponent: FC<CollectibleComponentProps> = ({ position }) => {
    return (
        <div
          aria-label="Collectible"
          className="absolute bg-accent rounded-full"
          style={{
            width: COLLECTIBLE_SIZE,
            height: COLLECTIBLE_SIZE,
            left: position.x,
            top: position.y,
          }}
        />
    );
};
