/* eslint-disable @next/next/no-img-element */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Props {
  size?: number;
  className?: string;
  rounded?: string;
}

/**
 * Brand mark. Uses the public/logo.jpeg file. Respects Next's basePath so it
 * works both on localhost and on the deployed sub-path (GitHub Pages).
 */
export function Logo({ size = 24, className = "", rounded = "rounded-md" }: Props) {
  return (
    <img
      src={`${BASE_PATH}/logo.jpeg`}
      alt="cLaude"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`${rounded} object-cover shrink-0 ${className}`}
      draggable={false}
    />
  );
}
