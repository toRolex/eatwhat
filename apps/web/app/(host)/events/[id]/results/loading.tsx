export default function ResultsLoading() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <div className="gp-skel" style={{ height: 12, width: 120, marginBottom: 28 }} />
      <div className="gp-skel" style={{ height: 14, width: 100, marginBottom: 8 }} />
      <div className="gp-skel" style={{ height: 36, width: '55%', marginBottom: 32 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="gp-skel" style={{ height: 92, animationDelay: `${i * 70}ms` }} />
        ))}
      </div>
    </main>
  );
}
