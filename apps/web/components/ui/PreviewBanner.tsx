// Shown only when an authenticated host views their own invite page
export default function PreviewBanner() {
  return (
    <div style={{
      width: '100%',
      background: 'oklch(94% .07 72)',
      borderBottom: '1px solid oklch(88% .10 72)',
      padding: '8px 16px',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 13,
        fontWeight: 500,
        color: 'oklch(40% .15 72)',
        margin: 0,
        fontFamily: 'var(--fb)',
      }}>
        Preview mode — this is how your guests will see the invitation.
      </p>
    </div>
  );
}
