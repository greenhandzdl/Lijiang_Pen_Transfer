import { useEffect, useRef } from 'react';
import { ScrollEngine } from '../engine/ScrollEngine';
import type { PlaceId, TimeOfDay, VisitMode } from '../content/places';

type StageProps = {
  mode: VisitMode;
  time: TimeOfDay;
  target: PlaceId;
  walk: number;
  paused: boolean;
  singVersion: number;
  zoomVersion: number;
  zoomFactor: number;
  onPlace: (id: PlaceId) => void;
  onPosition: (progress: number) => void;
  onError: (message: string) => void;
};

export default function ScrollStage(props: StageProps) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ScrollEngine | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    if (!host.current) return;
    const scrollEngine = new ScrollEngine(host.current, {
      onPlace: (id) => callbacks.current.onPlace(id),
      onPosition: (progress) => callbacks.current.onPosition(progress),
      onError: (message) => callbacks.current.onError(message),
    });
    engine.current = scrollEngine;
    void scrollEngine.init().then(() => {
      if (engine.current !== scrollEngine) return;
      scrollEngine.setMode(callbacks.current.mode);
      scrollEngine.setTimeOfDay(callbacks.current.time);
      scrollEngine.focusPlace(callbacks.current.target);
    });
    return () => {
      engine.current = null;
      scrollEngine.destroy();
    };
  }, []);

  useEffect(() => { engine.current?.setMode(props.mode); }, [props.mode]);
  useEffect(() => { engine.current?.setTimeOfDay(props.time); }, [props.time]);
  useEffect(() => { engine.current?.focusPlace(props.target); }, [props.target]);
  useEffect(() => { engine.current?.setWalkDirection(props.walk); }, [props.walk]);
  useEffect(() => { engine.current?.setPaused(props.paused); }, [props.paused]);
  useEffect(() => { if (props.singVersion) engine.current?.sing(); }, [props.singVersion]);
  useEffect(() => {
    if (props.zoomVersion) engine.current?.zoomBy(props.zoomFactor);
  }, [props.zoomVersion, props.zoomFactor]);

  return <div ref={host} className="scroll-stage" />;
}
