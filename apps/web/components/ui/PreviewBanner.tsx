// Shown only when an authenticated host views their own invite page
export default function PreviewBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
      <p className="text-sm text-amber-800 font-medium">
        Preview mode — this is how your guests will see the invitation.
      </p>
    </div>
  );
}
