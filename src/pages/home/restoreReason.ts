export type RestoreReasonCode =
  | "UI_RESTORE_REASON_UNSPECIFIED"
  | "UI_RESTORE_REASON_RESOLVED"
  | "UI_RESTORE_REASON_NO_TAB"
  | "UI_RESTORE_REASON_NO_RUN"
  | "UI_RESTORE_REASON_ERROR";

export const normalizeRestoreReason = (reason?: unknown): RestoreReasonCode => {
  if (typeof reason === "string") {
    const trimmed = reason.trim();
    if (trimmed === "UI_RESTORE_REASON_RESOLVED") return "UI_RESTORE_REASON_RESOLVED";
    if (trimmed === "UI_RESTORE_REASON_NO_TAB") return "UI_RESTORE_REASON_NO_TAB";
    if (trimmed === "UI_RESTORE_REASON_NO_RUN") return "UI_RESTORE_REASON_NO_RUN";
    if (trimmed === "UI_RESTORE_REASON_ERROR") return "UI_RESTORE_REASON_ERROR";
    return "UI_RESTORE_REASON_UNSPECIFIED";
  }
  if (typeof reason === "number") {
    if (reason === 1) return "UI_RESTORE_REASON_RESOLVED";
    if (reason === 2) return "UI_RESTORE_REASON_NO_TAB";
    if (reason === 3) return "UI_RESTORE_REASON_NO_RUN";
    if (reason === 4) return "UI_RESTORE_REASON_ERROR";
    return "UI_RESTORE_REASON_UNSPECIFIED";
  }
  return "UI_RESTORE_REASON_UNSPECIFIED";
};

export const restoreReasonDescription = (reason?: unknown): string => {
  const code = normalizeRestoreReason(reason);
  switch (code) {
    case "UI_RESTORE_REASON_RESOLVED":
      return "restore target resolved and run is available";
    case "UI_RESTORE_REASON_NO_TAB":
      return "no tab could be resolved for the project";
    case "UI_RESTORE_REASON_NO_RUN":
      return "resolved tab has no run attached";
    case "UI_RESTORE_REASON_ERROR":
      return "restore failed due to server-side error";
    default:
      return "restore reason is unspecified";
  }
};

export const isResolvedRestore = (reason?: unknown): boolean => {
  return normalizeRestoreReason(reason) === "UI_RESTORE_REASON_RESOLVED";
};
