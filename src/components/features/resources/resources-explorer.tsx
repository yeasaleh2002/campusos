"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSearch, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ResourceCard } from "@/components/features/resources/resource-card";
import { type ResourceCardData } from "@/components/features/resources/resource-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FilterChips } from "@/components/ui/filter-chips";
import { Select } from "@/components/ui/input";
import { ListView } from "@/components/ui/list-view";
import { SearchBar } from "@/components/ui/search-bar";
import { useCursorList } from "@/hooks/use-cursor-list";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { api } from "@/lib/api-client";
import { RESOURCE_TYPE, optionsOf } from "@/lib/labels";

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Course {
  id: string;
  code: string;
  title: string;
  semester: number;
}

const DEFAULTS = { q: "", departmentId: "", courseId: "", semester: "", year: "", type: "", sort: "relevance" };
const TYPE_OPTIONS = [{ value: "", label: "All types" }, ...optionsOf(RESOURCE_TYPE)];
const SORTS = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most downloaded" },
];
const SEMESTERS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const YEARS = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i));

type Filters = typeof DEFAULTS;

interface FilterPanelProps {
  values: Filters;
  set: (changes: Partial<Filters>) => void;
}

function FilterPanel({ values, set }: FilterPanelProps) {
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api.get<Department[]>("/api/departments"), staleTime: 3_600_000 });
  const courses = useQuery({
    queryKey: ["courses", values.departmentId],
    queryFn: () => api.get<Course[]>("/api/courses", { query: { departmentId: values.departmentId } }),
    enabled: Boolean(values.departmentId),
    staleTime: 3_600_000,
  });

  return (
    <div className="space-y-5">
      <Field label="Department">
        <Select value={values.departmentId} onChange={(event) => set({ departmentId: event.target.value, courseId: "" })}>
          <option value="">All departments</option>
          {departments.data?.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.code} - {dept.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Course" hint={values.departmentId ? undefined : "Choose a department first"}>
        <Combobox
          options={[{ value: "", label: "All courses" }, ...(courses.data?.map((course) => ({ value: course.id, label: `${course.code} · ${course.title}`, hint: `Semester ${course.semester}` })) ?? [])]}
          value={values.courseId}
          onChange={(courseId) => set({ courseId: courseId ?? "" })}
          placeholder="Search courses"
          emptyText="No matching course"
          disabled={!values.departmentId}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Semester">
          <Select value={values.semester} onChange={(event) => set({ semester: event.target.value })}>
            <option value="">Any</option>
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year">
          <Select value={values.year} onChange={(event) => set({ year: event.target.value })}>
            <option value="">Any</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Sort by">
        <Select value={values.sort} onChange={(event) => set({ sort: event.target.value })}>
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

/** Resource hub: search + sidebar filters (sheet on mobile), "Previous questions" shortcut, infinite scroll. */
export function ResourcesExplorer() {
  const { values, set, reset, activeCount } = useUrlFilters(DEFAULTS);
  const [sheet, setSheet] = useState(false);
  const query = useMemo(() => {
    const { sort, ...rest } = values;
    return { ...rest, sort: sort === "relevance" && !values.q ? "newest" : sort };
  }, [values]);
  const list = useCursorList<ResourceCardData>(["resources", "hub"], "/api/resources", { query, limit: 12 });
  const filterCount = ["departmentId", "courseId", "semester", "year", "sort"].filter((key) => values[key as keyof Filters] !== DEFAULTS[key as keyof Filters]).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Filters</h2>
          <FilterPanel values={values} set={set} />
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={reset}>
              Clear all
            </Button>
          )}
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="flex gap-3">
          <SearchBar value={values.q} onSearch={(q) => set({ q })} placeholder="Search notes, questions, course codes… (try “CSE 2101” or “dbms”)" label="Search resources" className="flex-1" />
          <Button variant="secondary" className="lg:hidden" onClick={() => setSheet(true)} aria-label="Open filters">
            <SlidersHorizontal /> Filters {filterCount > 0 && <Badge tone="primary">{filterCount}</Badge>}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterChips label="Resource type" options={TYPE_OPTIONS} value={values.type} onChange={(type) => set({ type })} className="flex-1" />
        </div>

        {values.q && <p className="text-sm text-fg-muted">Results for “{values.q}” - typos and short forms like “dbms” or “prev” are understood.</p>}

        <ListView
          list={list}
          getKey={(resource) => resource.id}
          className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3"
          media={false}
          renderItem={(resource) => <ResourceCard resource={resource} query={values.q} />}
          empty={{
            title: values.q ? `Nothing found for “${values.q}”` : "No resources match",
            description: "Try fewer filters, another spelling, or upload what you have - the next student will thank you.",
            icon: <FileSearch />,
            action: (
              <Button variant="secondary" onClick={reset}>
                Reset filters
              </Button>
            ),
          }}
        />
      </div>

      <Dialog open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<Button onClick={() => setSheet(false)}>Show results</Button>}>
        <FilterPanel values={values} set={set} />
      </Dialog>
    </div>
  );
}
