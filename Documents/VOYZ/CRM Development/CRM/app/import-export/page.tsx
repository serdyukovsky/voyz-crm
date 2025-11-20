"use client"

import { useState } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { ImportUploader } from "@/components/crm/import-uploader"
import { ImportPreviewTable } from "@/components/crm/import-preview-table"
import { ColumnMappingForm } from "@/components/crm/column-mapping-form"
import { ExportPanel } from "@/components/crm/export-panel"

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showMapping, setShowMapping] = useState(false)

  const handleFileUpload = (file: File | null, preview: any[]) => {
    setUploadedFile(file)
    setPreviewData(preview)
    setShowMapping(preview.length > 0)
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header with tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-foreground mb-4">Import/Export</h1>
          <div className="flex gap-2 border-b border-border/50">
            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "import"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Import
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "export"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Export
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "import" ? (
          <div className="space-y-6">
            <ImportUploader onFileUpload={handleFileUpload} />
            {previewData.length > 0 && (
              <>
                <ImportPreviewTable data={previewData} fileName={uploadedFile?.name} />
                {showMapping && <ColumnMappingForm columns={Object.keys(previewData[0] || {})} />}
              </>
            )}
          </div>
        ) : (
          <ExportPanel />
        )}
      </div>
    </CRMLayout>
  )
}
