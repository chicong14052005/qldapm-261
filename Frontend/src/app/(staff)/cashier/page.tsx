import WorkspaceShell from "@/components/layout/WorkspaceShell";
import styles from "./cashier.module.css";

export default function CashierPage() {
  return (
    <div className={styles.cashierPage}>
      <WorkspaceShell initialTab="billing" />
    </div>
  );
}

