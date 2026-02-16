import { ReactNode } from "react";

export default function ReaderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
      {children}
    </div>
  );
}
