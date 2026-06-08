import { HotkeysProvider, useHotkey } from "@tanstack/react-hotkeys";
import type { ReactNode } from "react";
import { KeyboardShortcutsModal } from "@/features/map/components/KeyboardShortcutsModal";
import { asRegisterableHotkey } from "@/features/map/shortcuts/as-hotkey";
import { useKeyboardShortcutsStore } from "@/features/map/shortcuts/keyboard-shortcuts-store";
import { getShortcut, SHORTCUT_IDS } from "@/lib/shortcuts/catalog";

function KeyboardShortcutsHotkey() {
  const toggle = useKeyboardShortcutsStore((state) => state.toggle);
  const open = useKeyboardShortcutsStore((state) => state.open);
  const setOpen = useKeyboardShortcutsStore((state) => state.setOpen);

  useHotkey(asRegisterableHotkey(getShortcut(SHORTCUT_IDS.showKeyboardShortcuts).hotkey), () => {
    toggle();
  });

  useHotkey(
    asRegisterableHotkey("Escape"),
    () => {
      setOpen(false);
    },
    { enabled: open },
  );

  return null;
}

type KeyboardShortcutsProviderProps = {
  children: ReactNode;
};

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  return (
    <HotkeysProvider
      defaultOptions={{
        hotkey: {
          ignoreInputs: true,
          preventDefault: true,
        },
      }}
    >
      <KeyboardShortcutsHotkey />
      {children}
      <KeyboardShortcutsModal />
    </HotkeysProvider>
  );
}
