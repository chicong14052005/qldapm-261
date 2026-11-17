import type { ReactNode } from "react";
import styles from "./customer-layout.module.css";

export default function CustomerGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={styles.customerLayout}>{children}</div>;
}

