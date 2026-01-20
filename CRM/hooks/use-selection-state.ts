import { useState, useCallback, useMemo } from 'react';

export type SelectionMode = 'PAGE' | 'ALL_MATCHING';

export interface SelectionState {
  selectedIds: Set<string>;
  selectionMode: SelectionMode;
  excludedIds: Set<string>; // IDs excluded from ALL_MATCHING selection
  pageCount: number; // Number of items on current page (N)
  totalCount?: number; // Total count matching filter (M)
}

export interface UseSelectionStateReturn {
  state: SelectionState;
  selectAllOnPage: (ids: string[]) => void;
  selectAllMatching: (totalCount: number) => void;
  toggleItem: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
}

const initialState: SelectionState = {
  selectedIds: new Set(),
  selectionMode: 'PAGE',
  excludedIds: new Set(),
  pageCount: 0,
  totalCount: undefined,
};

export function useSelectionState(): UseSelectionStateReturn {
  const [state, setState] = useState<SelectionState>(initialState);

  const selectAllOnPage = useCallback((ids: string[]) => {
    setState((prev) => ({
      selectedIds: new Set(ids),
      selectionMode: 'PAGE',
      excludedIds: new Set(),
      pageCount: ids.length,
      totalCount: prev.totalCount, // Keep totalCount if available
    }));
  }, []);

  const selectAllMatching = useCallback((totalCount: number) => {
    setState((prev) => ({
      selectedIds: new Set(), // Clear page selection
      selectionMode: 'ALL_MATCHING',
      excludedIds: new Set(),
      pageCount: prev.pageCount, // Keep page count
      totalCount,
    }));
  }, []);

  const toggleItem = useCallback((id: string) => {
    setState((prev) => {
      if (prev.selectionMode === 'PAGE') {
        // Toggle in PAGE mode
        const newSelectedIds = new Set(prev.selectedIds);
        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
        } else {
          newSelectedIds.add(id);
        }
        return {
          ...prev,
          selectedIds: newSelectedIds,
        };
      } else {
        // Toggle in ALL_MATCHING mode: add/remove from excludedIds
        const newExcludedIds = new Set(prev.excludedIds);
        if (newExcludedIds.has(id)) {
          newExcludedIds.delete(id);
        } else {
          newExcludedIds.add(id);
        }
        return {
          ...prev,
          excludedIds: newExcludedIds,
        };
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState(initialState);
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      if (state.selectionMode === 'PAGE') {
        return state.selectedIds.has(id);
      } else {
        // ALL_MATCHING: selected if not excluded
        return !state.excludedIds.has(id);
      }
    },
    [state]
  );

  const getSelectedCount = useCallback(() => {
    if (state.selectionMode === 'PAGE') {
      return state.selectedIds.size;
    } else {
      // ALL_MATCHING: totalCount - excludedIds
      if (state.totalCount === undefined) {
        return 0;
      }
      return Math.max(0, state.totalCount - state.excludedIds.size);
    }
  }, [state]);

  return {
    state,
    selectAllOnPage,
    selectAllMatching,
    toggleItem,
    clearSelection,
    isSelected,
    getSelectedCount,
  };
}
