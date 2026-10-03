import Header from "@/components/Header";
import TripForm from "@/components/TripForm";
import AssumptionsCard from "@/components/AssumptionsCard";
import RouteMap from "@/components/RouteMap";
import StatCards from "@/components/StatCards";
import ItineraryList from "@/components/ItineraryList";
import EldSheet from "@/components/EldSheet";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        {/* left rail — fixed width, never overlaps main */}
        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[300px]">
          <TripForm />
          <AssumptionsCard />
        </aside>

        {/* main column — isolated stacking context, min-w-0 everywhere */}
        <main className="isolate flex min-w-0 flex-1 flex-col gap-3 pb-6">
          {/* top: map + stats (left) / itinerary (right) — side-by-side on xl only */}
          <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="no-print min-w-0">
                <RouteMap />
              </div>
              <div className="no-print min-w-0">
                <StatCards />
              </div>
              {/* mobile itinerary — stacked below map, never overlaid */}
              <div className="no-print min-w-0 xl:hidden">
                <ItineraryList />
              </div>
            </div>
            <div className="no-print hidden min-w-0 xl:block">
              <ItineraryList />
            </div>
          </div>

          {/* ELD sheets — full width below, no shared row with itinerary */}
          <div className="min-w-0">
            <EldSheet />
          </div>
        </main>
      </div>
    </div>
  );
}
