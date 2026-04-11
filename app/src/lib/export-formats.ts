export const EXPORT_FORMATS = [
  {
    id: "16:9",
    label: "Landscape",
    width: 1920,
    height: 1080,
  },
  {
    id: "1:1",
    label: "Square",
    width: 1080,
    height: 1080,
  },
  {
    id: "9:16",
    label: "Vertical",
    width: 1080,
    height: 1920,
  },
  {
    id: "4:5",
    label: "Portrait",
    width: 1080,
    height: 1350,
  },
] as const;

export type ExportFormatId = (typeof EXPORT_FORMATS)[number]["id"];

export function getExportFormatById(formatId: string) {
  return EXPORT_FORMATS.find((format) => format.id === formatId) ?? null;
}
