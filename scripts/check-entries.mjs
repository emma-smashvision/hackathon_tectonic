import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const env = parseEnv(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8"),
);
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const word = `connection-check-${randomUUID()}`;
let id;

try {
  const inserted = await supabase
    .from("entries")
    .insert({ word })
    .select("id, word")
    .single();
  if (inserted.error) throw inserted.error;
  id = inserted.data.id;
  assert.equal(inserted.data.word, word);

  const read = await supabase
    .from("entries")
    .select("word")
    .eq("id", id)
    .single();
  if (read.error) throw read.error;
  assert.equal(read.data.word, word);

  const removed = await supabase
    .from("entries")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (removed.error) throw removed.error;
  assert.equal(removed.data.id, id);

  const after = await supabase.from("entries").select("id").eq("id", id);
  if (after.error) throw after.error;
  assert.equal(after.data.length, 0);
  id = undefined;
  console.log(
    "Supabase insert, persisted read, delete, and deletion verification passed.",
  );
} finally {
  if (id) {
    const cleanup = await supabase.from("entries").delete().eq("id", id);
    if (cleanup.error)
      console.error(
        `Could not remove test entry ${id}: ${cleanup.error.message}`,
      );
  }
}
