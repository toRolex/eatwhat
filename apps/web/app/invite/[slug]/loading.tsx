export default function InviteLoading() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="gp-skel" style={{ height: 320, borderRadius: 'var(--r)' }} />
      </div>
    </main>
  );
}
