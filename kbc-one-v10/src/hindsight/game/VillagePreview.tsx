"use client";
import { useEffect, useRef, useState } from "react";
import { LandscapeCity } from "../../one/LandscapeCity";
import "../../one/one.css";
/** Development harness; the production entry is owned by Home. */
export function VillagePreview() {
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState("tom");
  const [focus, setFocus] = useState<string>();
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    setPerson(query.get("p") || "tom");
    setFocus(query.get("focus") ?? undefined);
  }, []);
  return (
    <main>
      <div
        ref={frame}
        style={{
          position: "absolute",
          width: 350,
          height: 650,
          top: 40,
          left: "calc(50% - 175px)",
          border: "8px solid #344966",
          borderRadius: 36,
          background: "#102239",
          padding: 30,
        }}
      >
        <h1>Your village</h1>
        <p>World verification · {person}</p>
        <button
          style={{
            marginTop: 350,
            background: "#ffc527",
            padding: 20,
            color: "#102239",
            borderRadius: 16,
          }}
          onClick={() => setOpen(true)}
        >
          Play · turn your phone
        </button>
      </div>
      {open && (
        <LandscapeCity
          personaId={person}
          focusLessonId={focus}
          frameRef={frame}
          onExit={() => setOpen(false)}
        />
      )}
    </main>
  );
}
