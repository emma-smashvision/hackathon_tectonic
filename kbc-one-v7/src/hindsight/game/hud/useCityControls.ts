"use client";

import { useGame } from "../runtime";

/** All city controls and preparation state come from the shared world API. */
export function useCityControls() {
  return useGame().gameApi;
}
