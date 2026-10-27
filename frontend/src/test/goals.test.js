import { describe, it, expect } from "vitest";
import goalsReducer, {
  loadGoals,
  addGoal,
  editGoal,
  removeGoal,
} from "../store/goalsSlice";

describe("goalsSlice reducer", () => {
  const initialState = {
    items: [],
    listRequestId: null,
    mutationRequestId: null,
    status: "idle",
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  };

  it("handles initial state", () => {
    expect(goalsReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("sets loading on loadGoals.pending", () => {
    const state = goalsReducer(initialState, loadGoals.pending());
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
  });

  it("sets items on loadGoals.fulfilled", () => {
    const mockGoals = [
      { id: "1", title: "Goal 1", progress: 0, targetValue: 10, unit: "hours" },
    ];
    const state = goalsReducer(
      { ...initialState, status: "loading", listRequestId: undefined },
      loadGoals.fulfilled(mockGoals)
    );
    expect(state.status).toBe("succeeded");
    expect(state.items).toEqual(mockGoals);
  });

  it("sets error on loadGoals.rejected", () => {
    const state = goalsReducer(
      { ...initialState, status: "loading", listRequestId: undefined },
      loadGoals.rejected(null, undefined, undefined, "Failed to load")
    );
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Failed to load");
  });

  it("prepends new goal on addGoal.fulfilled", () => {
    const prev = { ...initialState, items: [{ id: "1", title: "G1" }] };
    const newGoal = { id: "2", title: "G2" };
    const state = goalsReducer(goalsReducer(prev, addGoal.pending("add")), addGoal.fulfilled(newGoal, "add"));
    expect(state.items).toHaveLength(2);
    expect(state.items[0]).toEqual(newGoal);
    expect(state.mutationStatus).toBe("succeeded");
  });

  it("updates goal in place on editGoal.fulfilled", () => {
    const prev = {
      ...initialState,
      items: [
        { id: "1", title: "G1", progress: 0 },
        { id: "2", title: "G2", progress: 1 },
      ],
    };
    const updated = { id: "1", title: "G1 Updated", progress: 5 };
    const state = goalsReducer(goalsReducer(prev, editGoal.pending("edit")), editGoal.fulfilled(updated, "edit"));
    expect(state.items[0]).toEqual(updated);
    expect(state.items[1].title).toBe("G2");
  });

  it("removes goal on removeGoal.fulfilled", () => {
    const prev = {
      ...initialState,
      items: [
        { id: "1", title: "G1" },
        { id: "2", title: "G2" },
      ],
    };
    const state = goalsReducer(goalsReducer(prev, removeGoal.pending("delete")), removeGoal.fulfilled("1", "delete"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe("2");
  });
});
