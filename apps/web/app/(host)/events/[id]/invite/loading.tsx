export default function InviteLoading() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <div className="gp-skel" style={{ height: 12, width: 90, marginBottom: 28 }} />
      <div className="gp-skel" style={{ height: 36, width: '50%', marginBottom: 32 }} />
      <div className="gp-skel" style={{ height: 56, marginBottom: 24 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="gp-skel" style={{ height: 56, animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </main>
  );
}
