
'use client';

import type { FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { EnemyType } from './types';
import { cn } from '@/lib/utils';

const enemyTypeLabels: Record<EnemyType, string> = {
  fire: 'Fire',
  water: 'Water',
  earth: 'Earth',
  air: 'Air',
};

const enemyTypeColors: Record<EnemyType, string> = {
    fire: 'text-destructive',
    water: 'text-[hsl(var(--chart-3))]',
    earth: 'text-[hsl(var(--chart-1))]',
    air: 'text-muted-foreground',
}

type SettingsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledTypes: EnemyType[];
  onEnabledTypesChange: (types: EnemyType[]) => void;
};

export const SettingsMenu: FC<SettingsMenuProps> = ({
  open,
  onOpenChange,
  enabledTypes,
  onEnabledTypesChange,
}) => {
  const handleCheckedChange = (type: EnemyType, checked: boolean) => {
    let newEnabledTypes;
    if (checked) {
      newEnabledTypes = [...enabledTypes, type];
    } else {
      newEnabledTypes = enabledTypes.filter((t) => t !== type);
    }
    // Prevent unchecking the last box
    if (newEnabledTypes.length > 0) {
      onEnabledTypesChange(newEnabledTypes);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Configure which enemy types can spawn in the game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h4 className="font-medium">Enabled Enemy Types</h4>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(enemyTypeLabels) as EnemyType[]).map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={enabledTypes.includes(type)}
                  onCheckedChange={(checked) =>
                    handleCheckedChange(type, !!checked)
                  }
                  disabled={enabledTypes.includes(type) && enabledTypes.length === 1}
                />
                <Label htmlFor={type} className={cn("font-medium", enemyTypeColors[type])}>
                  {enemyTypeLabels[type]}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
