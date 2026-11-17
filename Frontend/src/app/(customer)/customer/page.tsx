import WorkspaceShell from "@/components/layout/WorkspaceShell";
import styles from "./customer.module.css";

export default function CustomerPage() {
  return (
    <div className={styles.customerPage}>
      <WorkspaceShell initialTab="menu" />
    </div>
  );
}

