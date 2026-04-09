import type { CSSProperties } from 'react';

export default function ShimmerCard({
  height = 120,
  style = {},
}: {
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="shimmer"
      style={{
        height,
        borderRadius: 12,
        width: '100%',
        ...style,
      }}
    />
  );
}
