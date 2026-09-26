import { useAuth } from '../auth/auth-context';
import { LinkButton } from '../../components/ui/link-button';

const FEATURES = [
  {
    title: 'Custom decks',
    description: 'Organize cards by subject, tag them, and keep every exam syllabus in one place.',
  },
  {
    title: 'Smart scheduling',
    description: 'FSRS-powered reviews surface each card right before you are about to forget it.',
  },
  {
    title: 'Study analytics',
    description: 'Track retention, streaks, and your daily workload forecast.',
  },
] as const;

export function LandingPage() {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <div className="flex flex-col items-center gap-12 py-10">
      <header className="flex max-w-2xl flex-col items-center gap-5 text-center">
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold tracking-widest text-emerald-300 uppercase">
          Epic 03 · Education
        </span>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">DeckUp</h1>
        <p className="text-lg text-slate-300">
          Custom flashcards with spaced repetition, built for students preparing final exams.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated ? (
            <LinkButton to="/dashboard">Go to my decks</LinkButton>
          ) : (
            <>
              <LinkButton to="/register">Get started</LinkButton>
              <LinkButton to="/login" variant="secondary">
                Sign in
              </LinkButton>
            </>
          )}
        </div>
      </header>

      <section className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <h2 className="text-base font-semibold text-white">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
