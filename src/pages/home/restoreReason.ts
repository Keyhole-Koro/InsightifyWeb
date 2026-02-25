import { UI_RESTORE_REASON, type UiRestoreReason } from "@/contracts/ui";

export const normalizeRestoreReason = (reason?: unknown): UiRestoreReason => {
  if (typeof reason !== "number" || !Number.isFinite(reason)) {
    return UI_RESTORE_REASON.UNSPECIFIED;
  }
  const value = Math.trunc(reason);
  if (value === UI_RESTORE_REASON.RESOLVED) return UI_RESTORE_REASON.RESOLVED;
  if (value === UI_RESTORE_REASON.NO_TAB) return UI_RESTORE_REASON.NO_TAB;
  if (value === UI_RESTORE_REASON.NO_RUN) return UI_RESTORE_REASON.NO_RUN;
  if (value === UI_RESTORE_REASON.ERROR) return UI_RESTORE_REASON.ERROR;
  return UI_RESTORE_REASON.UNSPECIFIED;
};

export const restoreReasonDescription = (reason?: unknown): string => {
  const code = normalizeRestoreReason(reason);
  switch (code) {
    case UI_RESTORE_REASON.RESOLVED:
      return "restore target resolved and run is available";
    case UI_RESTORE_REASON.NO_TAB:
      return "no tab could be resolved for the project";
    case UI_RESTORE_REASON.NO_RUN:
      return "resolved tab has no run attached";
    case UI_RESTORE_REASON.ERROR:
      return "restore failed due to server-side error";
    default:
      return "restore reason is unspecified";
  }
};

export const isResolvedRestore = (reason?: unknown): boolean => {
  return normalizeRestoreReason(reason) === UI_RESTORE_REASON.RESOLVED;
};
