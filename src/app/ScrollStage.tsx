import { useEffect, useRef } from 'react';
import { ScrollEngine } from '../engine/ScrollEngine';
import type { PlaceId, TimeOfDay, VisitMode } from '../content/places';

type StageProps = {
  mode: VisitMode;
  time: TimeOfDay;
  target: PlaceId;
  walking: number;
  actionNumber: number;
  actionType: 'gaze' | 'song';
  zoomNumber: number;
  zoomFactor: number;
  onReady: () => void;
  onPlace: (id: PlaceId) => void;
  onPosition: (progress: number) => void;
  onError: (message: string) => void;
};

export default function ScrollStage(props: StageProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ScrollEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!container.current) return;
    const engine = new ScrollEngine(container.current, {
      onReady: () => latest.current.onReady(),
      onPlace: (id) => latest.current.onPlace(id),
      onPosition: (value) => latest.current.onPosition(value),
      onError: (message) => latest.current.onError(message),
    });
    engineRef.current = engine;
    void engine.init().then(() => {
      if (engineRef.current !== engine) return;
      engine.setMode(latest.current.mode);
      engine.setTimeOfDay(latest.current.time);
      engine.focusPlace(latest.current.target, true);
    });
    return () => {
      engineRef.current = null;
      engine.destroy();
    };
  }, []);

  useEffect(() => { engineRef.current?.setMode(props.mode); }, [props.mode]);
  useEffect(() => { engineRef.current?.setTimeOfDay(props.time); }, [props.time]);
  useEffect(() => { engineRef.current?.focusPlace(props.target); }, [props.target]);
  useEffect(() => { engineRef.current?.setWalkDirection(props.walking); }, [props.walking]);
  useEffect(() => {
    if (props.actionNumber > 0) engineRef.current?.performAction(props.actionType);
  }, [props.actionNumber, props.actionType]);
  useEffect(() => {
    if (props.zoomNumber > 0) engineRef.current?.zoomBy(props.zoomFactor);
  }, [props.zoomNumber, props.zoomFactor]);

  return <div ref={container} className="scroll-stage" />;
}
