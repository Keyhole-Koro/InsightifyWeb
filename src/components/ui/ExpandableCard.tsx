import { ReactNode, useState } from "react";
import { Box, IconButton, Paper, PaperProps } from "@mui/material";
import { ExpandIcon, CollapseIcon } from "@/components/icons";

interface ExpandableCardProps extends Omit<PaperProps, "children"> {
  header?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  expandedWidth?: string | number;
  expandedHeight?: string | number;
  collapsedWidth?: string | number;
  collapsedHeight?: string | number;
  buttonPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export const ExpandableCard = ({
  header,
  children,
  defaultExpanded = false,
  expandedWidth = "80vw",
  expandedHeight = "80vh",
  collapsedWidth = 56,
  collapsedHeight = 56,
  buttonPosition = "bottom-left",
  sx,
  ...paperProps
}: ExpandableCardProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const width = isExpanded ? expandedWidth : collapsedWidth;
  const height = isExpanded ? expandedHeight : collapsedHeight;

  const buttonPositionStyles = {
    "top-left": { top: 8, left: 8 },
    "top-right": { top: 8, right: 8 },
    "bottom-left": { bottom: 8, left: 8 },
    "bottom-right": { bottom: 8, right: 8 },
  }[buttonPosition];

  return (
    <Paper
      elevation={6}
      {...paperProps}
      sx={{
        width,
        height,
        transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
        overflow: "hidden",
        borderRadius: 4,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        ...sx,
      }}
    >
      {header && (
        <Box
          sx={{
            height: 56,
            display: "flex",
            alignItems: "center",
            px: 2,
            pl: isExpanded ? 2 : 7,
            borderBottom: isExpanded ? "1px solid" : "none",
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          {header}
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          opacity: isExpanded ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          pointerEvents: isExpanded ? "auto" : "none",
          minHeight: isExpanded ? "300px" : 0,
        }}
      >
        {children}
      </Box>
      <IconButton
        onClick={() => setIsExpanded(!isExpanded)}
        color="primary"
        sx={{
          position: "absolute",
          ...buttonPositionStyles,
          zIndex: 10,
          bgcolor: isExpanded ? "rgba(255,255,255,0.9)" : "transparent",
          "&:hover": {
            bgcolor: isExpanded ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.04)",
          },
          boxShadow: isExpanded ? 1 : 0,
        }}
      >
        {isExpanded ? <CollapseIcon size={20} /> : <ExpandIcon size={20} />}
      </IconButton>
    </Paper>
  );
};
