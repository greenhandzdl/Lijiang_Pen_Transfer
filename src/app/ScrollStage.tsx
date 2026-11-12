import { useEffect, useRef } from 'react';
import { ScrollEngine } from '../engine/ScrollEngine';
import type { NightMusic } from '../engine/NightMusic';
import type { PlaceId, TimeOfDay, VisitMode } from '../content/places';
import type { EncounterId, NightView } from '../content/encounters';

type StageProps = {
  mode: VisitMode;
  time: TimeOfDay;
  target: PlaceId;
  walking: number;
  nightView: NightView;
  nightLights: boolean;
  nightRhythm: boolean;
  nightDrones: boolean;
  musicPlaying: boolean;
  musicController: NightMusic | null;
  previewNumber: number;
  previewId: EncounterId;
  actionNumber: number;
  actionType: 'gaze' | 'song';
  zoomNumber: number;
  zoomFactor: number;
  onReady: () => void;
  onPlace: (id: PlaceId) => void;
  onEncounter: (id: EncounterId) => void;
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
      onEncounter: (id) => latest.current.onEncounter(id),
      onPosition: (value) => latest.current.onPosition(value),
      onError: (message) => latest.current.onError(message),
    });
    engineRef.current = engine;
    void engine.init().then(() => {
      if (engineRef.current !== engine) return;
      engine.setMode(latest.current.mode);
      engine.setTimeOfDay(latest.current.time);
      engine.setNightControls({ view: latest.current.nightView, lights: latest.current.nightLights, rhythm: latest.current.nightRhythm, music: latest.current.musicPlaying, drones: latest.current.nightDrones });
      engine.setMusicController(latest.current.musicController);
      engine.focusPlace(latest.current.target, true);
    });
    return () => {
      engineRef.current = null;
      engine.destroy();
    };
  }, []);

  useEffect(() => { engineRef.current?.setMode(props.mode); }, [props.mode]);
  useEffect(() => { engineRef.current?.setTimeOfDay(props.time); }, [props.time]);
  useEffect(() => {
    engineRef.current?.setNightControls({ view: props.nightView, lights: props.nightLights, rhythm: props.nightRhythm, music: props.musicPlaying, drones: props.nightDrones });
  }, [props.nightView, props.nightLights, props.nightRhythm, props.nightDrones, props.musicPlaying]);
  useEffect(() => { engineRef.current?.setMusicController(props.musicController); }, [props.musicController]);
  useEffect(() => {
    if (props.previewNumber) engineRef.current?.previewEncounter(props.previewId);
  }, [props.previewNumber, props.previewId]);
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
