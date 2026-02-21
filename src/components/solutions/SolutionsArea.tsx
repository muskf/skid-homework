import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useProblemsStore } from "@/store/problems-store";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  OrderedSolution,
  useSolutionExport,
} from "@/hooks/use-solution-export";
import ActiveSolutionContent from "./ActiveSolutionContent";

export default function SolutionsArea() {
  const { t } = useTranslation("commons", { keyPrefix: "solutions" });
  const { t: tCommon } = useTranslation("commons");

  const viewerRef = useRef<HTMLDivElement | null>(null);

  const {
    imageItems,
    imageSolutions,
    selectedImageId,
    setSelectedImageId,
    setSelectedProblem,
    isWorking,
  } = useProblemsStore((s) => s);

  const prefersTouch = useMediaQuery("(pointer: coarse)");

  // 1. Build Ordered List
  // We use the order of imageItems (upload order) and attach solution data
  const orderedSolutions: OrderedSolution[] = useMemo(() => {
    return imageItems
      .filter((item) => imageSolutions.has(item.id)) // Only show items with solutions/processing
      .map((item) => ({
        item,
        solutions: imageSolutions.get(item.id)!,
      }));
  }, [imageItems, imageSolutions]);

  // 2. Determine Active Index
  const currentImageIdx = useMemo(() => {
    if (!orderedSolutions.length) return -1;
    if (!selectedImageId) return 0;
    const idx = orderedSolutions.findIndex(
      (e) => e.item.id === selectedImageId,
    );
    return idx === -1 ? 0 : idx;
  }, [orderedSolutions, selectedImageId]);

  // 3. Sync Store State
  useEffect(() => {
    if (orderedSolutions.length === 0) {
      if (selectedImageId !== undefined) setSelectedImageId(undefined);
      return;
    }
    // Ensure we always have a valid selected ID if data exists
    const validId = orderedSolutions[currentImageIdx]?.item.id;
    if (validId && selectedImageId !== validId) {
      setSelectedImageId(validId);
    }
  }, [
    orderedSolutions.length,
    currentImageIdx,
    selectedImageId,
    setSelectedImageId,
    orderedSolutions,
  ]);

  // 4. Export Logic
  const { handleExportMarkdown, handleExportPdf, hasExportableContent } =
    useSolutionExport(orderedSolutions);

  // 5. Image Navigation Handlers
  const handleNavigateImage = useCallback(
    (direction: "next" | "prev") => {
      if (!orderedSolutions.length) return;

      let nextIdx =
        direction === "next" ? currentImageIdx + 1 : currentImageIdx - 1;

      // Loop around
      if (nextIdx >= orderedSolutions.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = orderedSolutions.length - 1;

      setSelectedImageId(orderedSolutions[nextIdx].item.id);
      setSelectedProblem(0); // Reset problem focus
    },
    [currentImageIdx, orderedSolutions, setSelectedImageId, setSelectedProblem],
  );

  // Global Keydown for Image Switching (Left/Right Arrow)
  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    // Only capture if not typing in an input
    if (
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLInputElement
    )
      return;

    // Restore original navigation logic: Tab or Arrows for Image switching
    if (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();

      // Shift+Tab OR ArrowLeft = Previous
      // Tab OR ArrowRight = Next
      const isPrev = e.shiftKey || e.key === "ArrowLeft";
      handleNavigateImage(isPrev ? "prev" : "next");

      // focus the viewer
      setTimeout(() => viewerRef.current?.focus(), 0);
    }
  };

  return (
    <Card className="rounded-2xl shadow" onKeyDown={handleGlobalKeyDown}>
      <CardHeader className="px-6 pb-0">
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            disabled={!hasExportableContent}
          >
            {t("export.button")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!hasExportableContent}
          >
            PDF
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-2">
        {!orderedSolutions.length ? (
          <div className="text-sm text-gray-400 py-8 text-center">
            {isWorking ? t("analyzing") : t("idle")}
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs
              value={selectedImageId}
              onValueChange={(id) => {
                setSelectedImageId(id);
                setSelectedProblem(0);
              }}
              className="w-full"
            >
              {/* Tab List */}
              <TabsList className="flex flex-wrap gap-2 h-auto p-1 bg-muted/50">
                {orderedSolutions.map((entry, idx) => (
                  <TabsTrigger
                    key={entry.item.id}
                    value={entry.item.id} // Fixed: Uses ID
                    className="shrink-0"
                  >
                    {entry.item.displayName ||
                      t("tabs.fallback", { index: idx + 1 })}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Mobile Navigation Buttons */}
              {orderedSolutions.length > 1 && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size={prefersTouch ? "lg" : "default"}
                    className="flex-1 justify-center gap-2 py-4 text-base"
                    variant="outline"
                    onClick={() => handleNavigateImage("prev")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                    {tCommon("solution-viewer.navigation.prev-image")}
                  </Button>
                  <Button
                    size={prefersTouch ? "lg" : "default"}
                    className="flex-1 justify-center gap-2 py-4 text-base"
                    onClick={() => handleNavigateImage("next")}
                  >
                    {tCommon("solution-viewer.navigation.next-image")}
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {prefersTouch && (
                <p className="mt-3 text-xs text-muted-foreground sm:hidden">
                  {t("gesture-hint")}
                </p>
              )}

              {/* Content Areas */}
              {orderedSolutions.map((entry) => (
                <TabsContent
                  key={entry.item.id}
                  value={entry.item.id} // Fixed: Uses ID
                  className="mt-4 focus-visible:outline-none"
                >
                  {selectedImageId === entry.item.id && (
                    <ActiveSolutionContent
                      ref={viewerRef}
                      entry={entry}
                      isActive={true}
                      onNavigateImage={handleNavigateImage}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
