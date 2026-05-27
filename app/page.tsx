import Link from 'next/link'
import NavBar from '../components/NavBar'

const dashboardCards = [
  {
    title: 'Chores',
    description: 'Track today’s jobs, points and resets.',
    href: '/chores',
    emoji: '🧹',
  },
  {
    title: 'Routines',
    description: 'Morning, after school and bedtime routines.',
    href: '/routines',
    emoji: '🌅',
  },
  {
    title: 'Meals',
    description: 'Rate family meals and find favourites.',
    href: '/meals',
    emoji: '🍽️',
  },
  {
    title: 'I’m Bored',
    description: 'Get quick activity ideas for the family.',
    href: '/bored',
    emoji: '🎲',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <NavBar />

        <section className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            Family Hub
          </h1>

          <p className="max-w-2xl text-lg text-slate-600">
            Your family command centre for chores, routines, meals and boredom-busting ideas.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 text-6xl">
                {card.emoji}
              </div>

              <h2 className="mb-2 text-3xl font-semibold">
                {card.title}
              </h2>

              <p className="text-slate-600">
                {card.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}