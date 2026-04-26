export default function DashboardLoading() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <div className="gp-skel" style={{ height: 14, width: 90, marginBottom: 14 }} />
      <div className="gp-skel" style={{ height: 36, width: '60%', marginBottom: 32 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="gp-skel" style={{ height: 88, animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </main>
  );
}
