import React from "react";

export interface TabOption<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  className?: string;
}

export const Tabs = <T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabsProps<T>) => {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        backgroundColor: "#f1f5f9",
        padding: "4px",
        borderRadius: "8px",
        gap: "4px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              backgroundColor: isActive ? "#ffffff" : "transparent",
              color: isActive ? "#0f172a" : "#64748b",
              boxShadow: isActive
                ? "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)"
                : "none",
              outline: "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
