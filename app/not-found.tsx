import Link from "next/link";

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="auth-main stack">
      <section className="card stack">
        <h1>Not Found</h1>
        <p className="muted">The requested incident does not exist.</p>
        <Link href="/incidents">Back to incidents</Link>
      </section>
    </main>
  );
}
