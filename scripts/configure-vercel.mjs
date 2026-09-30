import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = parseEnv(readFileSync(`${root}.env.local`, "utf8"));
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];
for (const name of names) {
  if (!env[name]) throw new Error(`Set ${name} in .env.local first.`);
}

const project = JSON.parse(readFileSync(`${root}.vercel/project.json`, "utf8"));
if (project.projectId !== "prj_ZieglFSIcMTj9vxYyWJwih1S7wGk") {
  throw new Error(
    "Link this checkout to the hackathon-tectonic Vercel project.",
  );
}

const health = await fetch(
  new URL("/auth/v1/health", env.NEXT_PUBLIC_SUPABASE_URL),
  {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    signal: AbortSignal.timeout(15_000),
  },
);
if (!health.ok) {
  throw new Error(
    `Supabase credential check failed (HTTP ${health.status}). Check the URL and publishable key in .env.local. No Vercel settings were changed.`,
  );
}

const cli = ["vercel@61.0.0"];
const scope = ["--scope", "thomas-projects-18c8a57b"];
for (const name of names) {
  execFileSync(
    "bunx",
    [
      ...cli,
      "env",
      "add",
      name,
      "development,preview,production",
      "--project",
      project.projectId,
      "--force",
      "--yes",
      "--no-sensitive",
      ...scope,
    ],
    { cwd: root, input: env[name], stdio: ["pipe", "inherit", "inherit"] },
  );
}

execFileSync("bunx", [...cli, "deploy", "--prod", "--yes", ...scope], {
  cwd: root,
  stdio: "inherit",
});
