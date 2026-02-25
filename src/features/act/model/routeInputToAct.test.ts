import { describe, it, expect } from "vitest";
import { routeInputToAct, type ActInputRoute } from "./routeInputToAct";

describe("routeInputToAct", () => {
    it("returns null for empty input", () => {
        expect(routeInputToAct(null, "")).toBeNull();
        expect(routeInputToAct(null, "   ")).toBeNull();
        expect(routeInputToAct("act-1", "")).toBeNull();
        expect(routeInputToAct("act-1", "   ")).toBeNull();
    });

    it("returns create route when selectedActId is null", () => {
        const result = routeInputToAct(null, "hello world");
        expect(result).toEqual<ActInputRoute>({
            kind: "create",
            input: "hello world",
        });
    });

    it("returns create route when selectedActId is undefined", () => {
        const result = routeInputToAct(undefined, "hello world");
        expect(result).toEqual<ActInputRoute>({
            kind: "create",
            input: "hello world",
        });
    });

    it("returns create route when selectedActId is whitespace-only", () => {
        const result = routeInputToAct("   ", "hello world");
        expect(result).toEqual<ActInputRoute>({
            kind: "create",
            input: "hello world",
        });
    });

    it("returns existing route when selectedActId is set", () => {
        const result = routeInputToAct("act-123", "do something");
        expect(result).toEqual<ActInputRoute>({
            kind: "existing",
            actId: "act-123",
            input: "do something",
        });
    });

    it("trims input whitespace", () => {
        const result = routeInputToAct(null, "  hello  ");
        expect(result).toEqual<ActInputRoute>({
            kind: "create",
            input: "hello",
        });
    });

    it("trims selectedActId whitespace before routing", () => {
        const result = routeInputToAct("  act-1  ", "hello");
        expect(result).toEqual<ActInputRoute>({
            kind: "existing",
            actId: "act-1",
            input: "hello",
        });
    });
});
