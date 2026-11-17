import WorkspaceShell from "@/components/layout/WorkspaceShell";
import styles from "./waiter.module.css";

export default function WaiterPage() {
  return (
    <div className={styles.waiterPage}>
      <WorkspaceShell initialTab="tables" />
    </div>
  );
}

