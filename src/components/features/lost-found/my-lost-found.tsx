"use client";

import { PackageSearch, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LostFoundCard, type LostFoundCardData } from "@/components/features/lost-found/lost-found-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListView } from "@/components/ui/list-view";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { queryKeys } from "@/lib/query-client";

interface MyItem extends LostFoundCardData {
  contactVisible: boolean;
  _count: { claims: number };
}

const TABS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RESOLVED", label: "Returned" },
] as const;

/** The user's own posts; managing claims happens on each post page. */
export function MyLostFound() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("");
  const list = useCursorList<MyItem>([...queryKeys.myLostFound, tab], "/api/me/lost-found", { query: { status: tab } });

  return (
    <div className="space-y-6">
      <Tabs label="Post status" items={[...TABS]} value={tab} onValueChange={setTab} />
      <ListView
        list={list}
        getKey={(item) => item.id}
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        renderItem={(item) => (
          <LostFoundCard
            item={item}
            footer={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item._count.claims > 0 ? "warning" : "neutral"}>
                  {item._count.claims} claim{item._count.claims === 1 ? "" : "s"}
                </Badge>
                <Button asChild size="sm" variant="soft">
                  <Link href={`/lost-found/${item.id}`}>Manage</Link>
                </Button>
              </div>
            }
          />
        )}
        empty={{
          title: "You have not posted anything",
          description: "Lost or found something on campus? Post it and we will look for matches.",
          icon: <PackageSearch />,
          action: (
            <Button asChild variant="gradient">
              <Link href="/lost-found/new">
                <Plus /> Post an item
              </Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
