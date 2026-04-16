declare module "react-katex" {
  import type { FC } from "react";
  type Props = { math: string; errorColor?: string; renderError?: (e: Error) => React.ReactNode };
  export const InlineMath: FC<Props>;
  export const BlockMath: FC<Props>;
}
