"use client";

import { useEffect, useMemo, useState } from "react";
import EventCard from "@/components/events/EventCard";
import { EVENTS } from "@/lib/data/events";
import { useAppStore } from "@/stores/useAppStore";
import { getEvents } from "@/lib/firebase/firestore";
import { mapEventToCardEvent } from "@/lib/utils/firestoreMappers";
import { isAlgoliaSearchConfigured, searchEventsInAlgolia } from "@/lib/search/algolia";
import ShimmerCard from "@/components/shared/ShimmerCard";
import type { Event } from "@/types";

const MODES = ["All", "Online", "Offline", "Hybrid"] as const;
type Mode = (typeof MODES)[number];

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<Mode>("All");
  const [events, setEvents] = useState<Event[]>([]);
  const [remoteSearchResults, setRemoteSearchResults] = useState<Event[] | null>(null);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [loading, setLoading] = useState(true);
  const { bookmarked, toggleBookmark } = useAppStore();

  useEffect(() => {
    let mounted = true;

    getEvents({ limitCount: 60 })
      .then((docs) => {
        if (!mounted) return;
        const mapped = docs.map((e) => mapEventToCardEvent(e));
        setEvents(mapped.length ? mapped : EVENTS);
      })
      .catch(() => {
        if (mounted) setEvents(EVENTS);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents = useMemo(() => events.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.org.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q));
    const matchMode = modeFilter === "All" || e.mode === modeFilter;
    return matchQ && matchMode;
  }), [events, modeFilter, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteSearchResults(null);
      setSearchingRemote(false);
      return;
    }

    if (!isAlgoliaSearchConfigured()) {
      setRemoteSearchResults(null);
      return;
    }

    let active = true;
    setSearchingRemote(true);

    searchEventsInAlgolia(q, modeFilter === "All" ? undefined : modeFilter)
      .then((hits) => {
        if (!active) return;
        setRemoteSearchResults(hits);
      })
      .catch(() => {
        if (!active) return;
        setRemoteSearchResults(null);
      })
      .finally(() => {
        if (active) setSearchingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, modeFilter]);

  const displayedEvents = remoteSearchResults ?? filteredEvents;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🚀 Discover Events
        </h1>
        <p style={{ color: "#8B8BAD" }}>Find hackathons, competitions, and tech fests across India</p>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="🔍 Search events, orgs, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {MODES.map((m) => (
            <button
              key={m}
              className="pill"
              onClick={() => setModeFilter(m)}
              style={{
                background: modeFilter === m ? "#6C3BFF33" : "#1E1E35",
                color: modeFilter === m ? "#8B5CF6" : "#8B8BAD",
                border: `1px solid ${modeFilter === m ? "#6C3BFF" : "#2D2D50"}`,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {(loading || searchingRemote) && [1, 2, 3, 4].map((i) => <ShimmerCard key={i} height={260} />)}
        {displayedEvents.map((ev) => (
          <EventCard key={ev.id} ev={ev} bookmarked={bookmarked} onToggleBookmark={toggleBookmark} large />
        ))}
        {!loading && !searchingRemote && displayedEvents.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#5A5A80" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#8B8BAD" }}>No events found</div>
            <div>Try adjusting your search or filters</div>
          </div>
        )}
      </div>
    </div>
  );
}
