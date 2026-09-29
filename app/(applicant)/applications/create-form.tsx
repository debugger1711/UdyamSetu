"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProjectOption = {
  id: string;
  name: string;
};

export function CreateApplicationForm({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !title.trim()) {
      setError("Choose a project and enter an application title.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const body = (await response.json()) as { error?: string; application?: { id?: string } };
      if (!response.ok || !body.application?.id) {
        setError(body.error ?? "Application could not be created.");
        setPending(false);
        return;
      }

      router.push(`/applications/${body.application.id}`);
      router.refresh();
    } catch {
      setError("Application could not be created.");
      setPending(false);
    }
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
      <h2 className="text-sm font-bold text-slate-900">Start an application</h2>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <label className="space-y-1.5">
          <span className="font-semibold text-slate-700">Project</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="font-semibold text-slate-700">Application title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
          />
        </label>
      </div>
      {error ? <p className="text-[11px] text-rose-600 font-medium">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#0b1d35] hover:bg-[#122e50] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
      >
        {pending ? "Saving application..." : "Create application"}
      </button>
    </form>
  );
}
