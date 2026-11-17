import WorkspaceShell from "@/components/layout/WorkspaceShell";
import styles from "./kitchen.module.css";

export default function KitchenPage() {
  return (
    <div className={styles.kitchenPage}>
      <WorkspaceShell initialTab="kitchen" />
    </div>
  );
}

