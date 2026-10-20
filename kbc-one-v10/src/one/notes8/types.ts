export interface Note8 {
  id: string;
  roadId: string;
  stopId: string | null;
  text: string;
  createdAt: number;
  reviewAt: number;
  status: "review" | "approved";
  own: boolean;
  // v11-wa: optional for compatibility with older cached records.
  usefulCount?: number;
  usefulByMe?: boolean;
}
export interface NoteScopeProps {
  roadId: string;
  stopId?: string | null;
  /** Local demo persona key. Never transmitted to the API. */
  personId: string;
  className?: string;
  large?: boolean;
}
export function canPassItOn(stopId: string | null | undefined, passed: boolean, completed: boolean, alumnus: boolean) {
  return completed || alumnus || Boolean(stopId && passed);
}
