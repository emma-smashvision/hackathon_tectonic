import { WordList } from "./word-list";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-10 px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome to SmashVision x SuperiorSwarm!
        </h1>
      </header>
      <WordList />
    </main>
  );
}
