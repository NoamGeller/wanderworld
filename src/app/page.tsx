
import { GameBoard } from "@/components/game/game-board";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
      <div className="text-center mb-6">
        <h1 className="text-5xl font-bold text-primary font-headline tracking-tight">
          WanderWorld 2D
        </h1>
        <p className="text-muted-foreground mt-2">A simple adventure awaits.</p>
      </div>
      <GameBoard />
      <div className="mt-6 text-center text-muted-foreground text-sm space-y-1">
        <p><strong className="text-foreground">Objective:</strong> Collect golden squares to get traps. Use traps to defeat enemies and score points!</p>
        <p><strong className="text-foreground">Desktop Controls:</strong> Use Arrow Keys or WASD to move. Press Spacebar to place a trap.</p>
        <p><strong className="text-foreground">Mobile Controls:</strong> Use the joystick to move and the button to place a trap.</p>
        <p><strong className="text-foreground">Watch out!</strong> Avoid the red enemy, or your score will reset.</p>
      </div>
    </main>
  );
}
