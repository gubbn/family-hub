import NavBar from '../../components/NavBar'
export default function BoredPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
	  <NavBar />
        <h1 className="mb-6 text-5xl font-bold">I&apos;m Bored</h1>
        <p>Boredom buster coming next.</p>
      </div>
    </main>
  )
}