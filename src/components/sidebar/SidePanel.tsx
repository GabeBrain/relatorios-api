import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/store/map-store';
import FileDropZone from '@/components/upload/FileDropZone';
import LayerList from './LayerList';
import FeatureList from './FeatureList';

export default function SidePanel() {
  const sidebarOpen = useMapStore((s) => s.sidebarOpen);
  const setSidebarOpen = useMapStore((s) => s.setSidebarOpen);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);

  if (!sidebarOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="absolute left-3 top-3 z-30 rounded-xl bg-card shadow"
        onClick={() => setSidebarOpen(true)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <aside className="flex w-80 flex-col border-r border-border bg-card h-full overflow-hidden z-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Layers
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Upload */}
      <div className="px-4 pb-3">
        <FileDropZone />
      </div>

      {/* Layers & features */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <LayerList />
        <FeatureList />
      </div>
    </aside>
  );
}
