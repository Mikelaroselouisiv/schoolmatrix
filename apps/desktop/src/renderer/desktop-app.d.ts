import type {
  DesktopUpdaterPromptPayload,
  DesktopUpdaterSnoozeOption,
  DesktopUpdaterState,
} from './types/updater';

export {};

declare global {
  interface Window {
    schoolmatrixDesktop?: {
      edition: 'server' | 'remote' | string;
      apiBase: string;
      updater?: {
        getState: () => Promise<DesktopUpdaterState>;
        check: () => Promise<DesktopUpdaterState>;
        download: () => Promise<DesktopUpdaterState>;
        install: () => Promise<{ ok: boolean; error?: string }>;
        snooze: (optionKey: string) => Promise<DesktopUpdaterState>;
        dismiss: () => Promise<DesktopUpdaterState>;
        getSnoozeOptions: () => Promise<DesktopUpdaterSnoozeOption[]>;
        onState: (handler: (state: DesktopUpdaterState) => void) => () => void;
        onOpenPrompt: (handler: (payload?: DesktopUpdaterPromptPayload) => void) => () => void;
        onMenuCheck: (handler: () => void) => () => void;
      };
    };
  }
}
