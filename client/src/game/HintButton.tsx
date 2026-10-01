import { IconBulb } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button.tsx";
import styles from "./Controls.module.css";

/**
 * "Vihje": chooses the bot's move for the viewer's turn, ready to confirm. Disabled when it cannot
 * be used.
 */
export function HintButton({ disabled, onHint }: { disabled: boolean; onHint(): void }) {
  const { t } = useTranslation();
  return (
    <Button variant="secondary" className={styles.withIcon} onClick={onHint} disabled={disabled} title={t("hint.title")}>
      <IconBulb size={20} aria-hidden="true" />
      {t("hint.button")}
    </Button>
  );
}
