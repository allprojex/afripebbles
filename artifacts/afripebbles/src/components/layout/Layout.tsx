import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      {/* overflow-x-clip (not -hidden) contains the pages' decorative blur circles, which
          sit at negative offsets and otherwise push the document wider than the viewport
          on small phones. `clip` establishes no scroll container, so the product gallery's
          position:sticky keeps working. */}
      <main className="flex-1 pt-24 pb-12 flex flex-col overflow-x-clip">
        {children}
      </main>
      <Footer />
    </div>
  );
}
