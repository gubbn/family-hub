import Link from 'next/link'
import NavBar from '../../components/NavBar'
import ParentGate from '../../components/ParentGate'

const parentCards = [
  {
    title: 'Meals',
    description: 'Add meals and plan dinners for the week.',
    href: '/parent/meals',
    emoji: '🍽️',
  },
  {
    title: 'Schedule',
    description: 'Add and manage weekly events.',
    href: '/parent/schedule',
    emoji: '📅',
  },
  {
    title: 'Activities',
    description: 'Manage boredom buster ideas.',
    href: '/parent/activities',
    emoji: '🎲',
  },
  {
    title: 'Family',
    description: 'Manage family members and emojis.',
    href: '/parent/family',
    emoji: '👨‍👩‍👧',
  },
  {
  title: 'Chores',
  description: 'Add chores and assign them to family members.',
  href: '/parent/chores',
  emoji: '🧹',
},
]

export default function ParentPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone
        </h1>

        <ParentGate>
          <section className="grid gap-4 md:grid-cols-2">
            {parentCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 text-5xl">
                  {card.emoji}
                </div>

                <h2 className="mb-2 text-2xl font-semibold">
                  {card.title}
                </h2>

                <p className="text-sm text-slate-600">
                  {card.description}
                </p>
              </Link>
            ))}
          </section>
        </ParentGate>
      </div>
    </main>
  )
}