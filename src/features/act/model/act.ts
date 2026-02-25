import {
  UI_ACT_STATUS,
  UI_NODE_TYPE,
  type UiActStatus,
  type UiNode,
} from "@/contracts/ui";

export const canTransitionActStatus = (
  from: UiActStatus | undefined,
  to: UiActStatus,
): boolean => {
  const current = from ?? UI_ACT_STATUS.UNSPECIFIED;
  if (current === to) return true;

  switch (current) {
    case UI_ACT_STATUS.UNSPECIFIED:
      return to === UI_ACT_STATUS.IDLE || to === UI_ACT_STATUS.PLANNING;
    case UI_ACT_STATUS.IDLE:
      return to === UI_ACT_STATUS.PLANNING;
    case UI_ACT_STATUS.PLANNING:
      return (
        to === UI_ACT_STATUS.SUGGESTING ||
        to === UI_ACT_STATUS.SEARCHING ||
        to === UI_ACT_STATUS.RUNNING_WORKER ||
        to === UI_ACT_STATUS.NEEDS_USER_ACTION ||
        to === UI_ACT_STATUS.FAILED
      );
    case UI_ACT_STATUS.SUGGESTING:
    case UI_ACT_STATUS.SEARCHING:
      return (
        to === UI_ACT_STATUS.NEEDS_USER_ACTION || to === UI_ACT_STATUS.FAILED
      );
    case UI_ACT_STATUS.RUNNING_WORKER:
      return (
        to === UI_ACT_STATUS.DONE ||
        to === UI_ACT_STATUS.NEEDS_USER_ACTION ||
        to === UI_ACT_STATUS.FAILED
      );
    case UI_ACT_STATUS.NEEDS_USER_ACTION:
      return to === UI_ACT_STATUS.PLANNING || to === UI_ACT_STATUS.FAILED;
    case UI_ACT_STATUS.DONE:
    case UI_ACT_STATUS.FAILED:
      return to === UI_ACT_STATUS.PLANNING;
    default:
      return false;
  }
};

export const isActNode = (node: UiNode | undefined): boolean => {
  return (node?.type ?? UI_NODE_TYPE.UNSPECIFIED) === UI_NODE_TYPE.ACT;
};

export const isNeedsUserAction = (status: UiActStatus | undefined): boolean =>
  (status ?? UI_ACT_STATUS.UNSPECIFIED) === UI_ACT_STATUS.NEEDS_USER_ACTION;
