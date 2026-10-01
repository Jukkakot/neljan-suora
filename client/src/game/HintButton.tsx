import { IconBulb } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button.tsx";
import styles from "./Controls.module.css";

/**
 * "Vihje": shows the bot's column for the viewer's turn with a ghost berry, without playing it. Disabled when it cannot
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
