import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldSettings } from "./field-settings";
import { BulkPanel } from "./bulk-panel";
import type { CertificateField, BulkRow } from "@/types/certificate-field";

export function PropertiesSidebar({
  fields,
  selectedFieldId,
  bulkRows,
  bulkPreviewIndex,
  filenameTemplate,
  onUpdateField,
  onBulkRowsChange,
  onBulkPreviewIndexChange,
  onFilenameTemplateChange,
  onGenerateBulk,
  isGenerating,
}: {
  fields: CertificateField[];
  selectedFieldId: string;
  bulkRows: BulkRow[];
  bulkPreviewIndex: number;
  filenameTemplate: string;
  onUpdateField: (id: string, patch: Partial<CertificateField>) => void;
  onBulkRowsChange: (rows: BulkRow[]) => void;
  onBulkPreviewIndexChange: (index: number) => void;
  onFilenameTemplateChange: (value: string) => void;
  onGenerateBulk: (type: "pdf" | "jpg") => void;
  isGenerating: "pdf" | "jpg" | null;
}) {
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <aside className="h-full min-h-0 overflow-hidden border-l bg-background transition-colors duration-300">
      <Tabs defaultValue="design" className="flex h-full flex-col">
        <div className="border-b px-4 py-2">
          <TabsList className="h-9 w-full bg-muted/50 p-1">
            <TabsTrigger
              value="design"
              className="flex-1 text-[11px] font-bold uppercase tracking-tight"
            >
              Design
            </TabsTrigger>
            <TabsTrigger
              value="bulk"
              className="flex-1 text-[11px] font-bold uppercase tracking-tight"
            >
              Bulk
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <TabsContent value="design" className="m-0 p-4">
            {selectedField ? (
              <FieldSettings
                key={selectedField.id}
                field={selectedField}
                onChange={(patch) => onUpdateField(selectedField.id, patch)}
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center opacity-50">
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  No Layer Selected
                </p>
                <p className="mt-1 text-[9px]">
                  Select a layer to edit its properties
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="m-0 p-4">
            <BulkPanel
              fields={fields}
              rows={bulkRows}
              previewIndex={bulkPreviewIndex}
              filenameTemplate={filenameTemplate}
              isGenerating={isGenerating}
              onRowsChange={onBulkRowsChange}
              onPreviewIndexChange={onBulkPreviewIndexChange}
              onFilenameTemplateChange={onFilenameTemplateChange}
              onGenerate={onGenerateBulk}
            />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
