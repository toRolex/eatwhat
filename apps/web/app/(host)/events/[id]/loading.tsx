export default function EventLoading() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <div className="gp-skel" style={{ height: 12, width: 100, marginBottom: 28 }} />
      <div className="gp-skel" style={{ height: 18, width: 80, marginBottom: 12 }} />
      <div className="gp-skel" style={{ height: 40, width: '70%', marginBottom: 8 }} />
      <div className="gp-skel" style={{ height: 14, width: '50%', marginBottom: 32 }} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
        <div className="gp-skel" style={{ height: 38, width: 130 }} />
        <div className="gp-skel" style={{ height: 38, width: 110 }} />
      </div>

      <div className="gp-skel" style={{ height: 140, marginBottom: 24 }} />
      <div className="gp-skel" style={{ height: 110 }} />
    </main>
  );
}
