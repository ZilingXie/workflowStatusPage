import Link from "next/link";

export default function WorkflowRequestNotFoundPage(): JSX.Element {
  return (
    <main className="auth-main stack" style={{ minHeight: "100vh", justifyContent: "center" }}>
      <section className="card stack" style={{ maxWidth: 520 }}>
        <h1>Workflow Request Not Found</h1>
        <p className="muted">The requested workflow item does not exist.</p>
        <Link href="/workflow-requests">Back to workflow requests</Link>
      </section>
    </main>
  );
}
