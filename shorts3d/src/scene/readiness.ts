import { createContext, useContext, useLayoutEffect } from "react";

/**
 * Some scene parts finish setting up a few React commits after they mount
 * (e.g. @react-three/postprocessing creates its composer in an effect, then adds
 * passes on later commits). While Remotion renders, R3F only draws when told to,
 * so the first frame must wait until every registered part reports ready.
 */
export type ReadyCheck = () => boolean;
export const ReadyContext = createContext<Set<ReadyCheck> | null>(null);

export function useReadyCheck(check: ReadyCheck) {
  const registry = useContext(ReadyContext);
  useLayoutEffect(() => {
    if (!registry) return;
    registry.add(check);
    return () => void registry.delete(check);
  }, [registry, check]);
}
