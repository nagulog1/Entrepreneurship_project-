export default function LoadingSpinner({
  size = 24,
  color = '#6C3BFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid #2D2D50`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}
