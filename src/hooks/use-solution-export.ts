import { useCallback, useMemo } from "react";
import { type FileItem, type Solution } from "@/store/problems-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

export interface OrderedSolution {
  item: FileItem;
  solutions: Solution;
}

export function useSolutionExport(orderedSolutions: OrderedSolution[]) {
  const { t } = useTranslation("commons", { keyPrefix: "solutions" });

  const exportableSolutions = useMemo(
    () => orderedSolutions.filter((entry) => entry.solutions.problems.length),
    [orderedSolutions],
  );

  const buildMarkdownDocument = useCallback(() => {
    const lines: string[] = [];
    lines.push(`# ${t("export.document-title")}`);
    lines.push("");

    exportableSolutions.forEach((entry, pageIndex) => {
      lines.push(
        `## ${t("export.page-heading", {
          index: pageIndex + 1,
          name: entry.item.displayName,
        })}`,
      );
      lines.push("");

      entry.solutions.problems.forEach((problem, problemIdx) => {
        lines.push(
          `### ${t("export.problem-heading", { index: problemIdx + 1 })}`,
        );
        lines.push("");

        const ensureContent = (val: string | undefined | null, fb: string) =>
          val && val.trim().length > 0 ? val : fb;

        lines.push(`**${t("export.problem-label")}**`);
        lines.push("");
        lines.push(
          ensureContent(problem.problem, t("export.placeholders.problem")),
        );
        lines.push("");

        lines.push(`**${t("export.answer-label")}**`);
        lines.push("");
        lines.push(
          ensureContent(problem.answer, t("export.placeholders.answer")),
        );
        lines.push("");

        lines.push(`**${t("export.explanation-label")}**`);
        lines.push("");
        lines.push(
          ensureContent(
            problem.explanation,
            t("export.placeholders.explanation"),
          ),
        );
        lines.push("");
      });
    });

    return lines.join("\n");
  }, [exportableSolutions, t]);

  const handleExportMarkdown = useCallback(() => {
    if (!exportableSolutions.length) {
      toast.error(t("export.empty.title"), {
        description: t("export.empty.description"),
      });
      return;
    }

    try {
      const markdown = buildMarkdownDocument();
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `${t("export.filename-prefix")}-${timestamp}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 0);

      toast.success(t("export.success.title"), {
        description: t("export.success.description"),
      });
    } catch (error) {
      console.error("Failed to export markdown", error);
      toast.error(t("export.error.title"), {
        description: t("export.error.description"),
      });
    }
  }, [buildMarkdownDocument, exportableSolutions.length, t]);

  const handleExportPdf = useCallback(() => {
    if (!exportableSolutions.length) {
      toast.error(t("export.empty.title"), {
        description: t("export.empty.description"),
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      let y = 10;
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const lineHeight = 7;

      doc.setFontSize(20);
      doc.text(t("export.document-title"), margin, y);
      y += lineHeight * 2;

      exportableSolutions.forEach((entry, pageIdx) => {
        if (y > 250) {
          doc.addPage();
          y = 10;
        }

        doc.setFontSize(16);
        doc.text(
          t("export.page-heading", {
            index: pageIdx + 1,
            name: entry.item.displayName,
          }),
          margin,
          y,
        );
        y += lineHeight * 1.5;

        entry.solutions.problems.forEach((problem, probIdx) => {
          doc.setFontSize(14);
          doc.text(
            t("export.problem-heading", { index: probIdx + 1 }),
            margin,
            y,
          );
          y += lineHeight;

          doc.setFontSize(12);
          const content = [
            `${t("export.problem-label")}: ${problem.problem}`,
            `${t("export.answer-label")}: ${problem.answer}`,
            `${t("export.explanation-label")}: ${problem.explanation}`,
          ].join("\n\n");

          const lines = doc.splitTextToSize(content, pageWidth - margin * 2);
          lines.forEach((line: string) => {
            if (y > 280) {
              doc.addPage();
              y = 10;
            }
            doc.text(line, margin, y);
            y += lineHeight;
          });
          y += lineHeight;
        });
      });

      doc.save(`${t("export.filename-prefix")}-${timestamp}.pdf`);

      toast.success(t("export.success.title"), {
        description: t("export.success.description"),
      });
    } catch (error) {
      console.error("Failed to export PDF", error);
      toast.error(t("export.error.title"), {
        description: t("export.error.description"),
      });
    }
  }, [exportableSolutions, t]);

  return {
    handleExportMarkdown,
    handleExportPdf,
    hasExportableContent: exportableSolutions.length > 0,
  };
}
