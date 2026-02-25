export type ActInputRoute =
  | { kind: "existing"; actId: string; input: string }
  | { kind: "create"; input: string };

export const routeInputToAct = (
  selectedActId: string | null | undefined,
  input: string,
): ActInputRoute | null => {
  const trimmedInput = (input ?? "").trim();
  if (!trimmedInput) return null;
  const targetActId = (selectedActId ?? "").trim();
  if (targetActId) {
    return { kind: "existing", actId: targetActId, input: trimmedInput };
  }
  return { kind: "create", input: trimmedInput };
};
