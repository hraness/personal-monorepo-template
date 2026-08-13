import Link from "next/link";
import type { ReactNode } from "react";

import { publicSite } from "./site";

export function CollectionPageHeader({
  children,
  title,
}: Readonly<{
  children?: ReactNode;
  title: string;
}>) {
  return (
    <header className="content-page-header">
      <nav aria-label="breadcrumb">
        <Link href="/">{publicSite.name}</Link>
      </nav>
      <h1>{title}</h1>
      {children}
    </header>
  );
}
