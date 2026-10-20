import { describe, expect, test } from "bun:test";
import { pointersFor, previewRoad, roadViewFor } from "../../one/crowd";
import { driveStops, driveViewFor, nextDriveStop, publishedGhosts } from "./driveModel";

describe("Drive this road",()=>{
  test("Tom explores stops without moving the actual pointer",()=>{
    const pointers=pointersFor("tom"), before=JSON.stringify(pointers);
    const view=driveViewFor("tom","moving-house",{pointers})!, stops=driveStops(view);
    const first=nextDriveStop(stops,view.position.month!)!;
    const second=nextDriveStop(stops,first.month,first.stopId)!;
    expect(second.stopId).not.toBe(first.stopId);
    expect(view.position.month).toBe(0); expect(JSON.stringify(pointers)).toBe(before);
  });
  test("Karim's next stop is the same company fork as Map",()=>{
    const view=driveViewFor("karim","freelance")!, next=nextDriveStop(driveStops(view),20)!;
    expect(next.stopId).toBe("company"); expect(next.month).toBe(24);
    expect(view.fork!.comparisons[0].branches.map(b=>b.id)).toEqual(["sole","bv"]);
  });
  test("Sofie's preview never invents a position or purchase date",()=>{
    const view=driveViewFor("sofie","first-home")!;
    expect(view.position.month).toBeNull(); expect(view.position.date).toBeNull(); expect(view.position.preview).toBe(true);
  });
  test("Care, review roads and Large & simple cannot mount",()=>{
    for(const road of ["losing-parent","caring-parent","heat-pump"]) expect(driveViewFor("tom",road,{careOptIn:true})).toBeNull();
    expect(driveViewFor("margaret","everyday-only")).toBeNull();
    expect(driveViewFor("tom","moving-house",{largeSimple:true})).toBeNull();
  });
  test("Every visible ghost requires both the count and density gate",()=>{
    const view=roadViewFor("tom","moving-house")!;
    expect(publishedGhosts(view).length).toBeGreaterThan(0);
    expect(publishedGhosts({...view,ghostGroups:view.ghostGroups.map(g=>({...g,density:{shown:false,value:null,reason:"Withheld"}}))})).toEqual([]);
  });
  test("A host's live preview stage leaves confirmation unchanged",()=>{
    const pointers=previewRoad(pointersFor("tom"),"first-home",{month:3,label:"After the keys",date:null});
    expect(driveViewFor("tom","first-home",{pointers})!.position.month).toBe(3);
    expect(pointers.confirmed?.roadId).toBe("moving-house");
  });
  test("Everyday continues into next year",()=>{
    const view=driveViewFor("lina","everyday-only")!;
    expect(driveStops(view).every(s=>s.month >= view.position.month!)).toBe(true);
  });
});
