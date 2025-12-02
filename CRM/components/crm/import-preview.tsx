import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const previewData = [
  { name: "John Smith", email: "john@example.com", company: "Acme Corp", status: "valid" },
  { name: "Sarah Lee", email: "sarah@techstart.com", company: "TechStart Inc", status: "valid" },
  { name: "Mike Chen", email: "invalid-email", company: "CloudFlow", status: "error" },
  { name: "Emma Wilson", email: "emma@dataco.com", company: "DataCo", status: "valid" },
  { name: "Alex Turner", email: "alex@designhub.io", company: "DesignHub", status: "valid" },
]

export function ImportPreview() {
  const validRows = previewData.filter(row => row.status === "valid").length
  const errorRows = previewData.filter(row => row.status === "error").length

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <Card className="border-border border-dashed bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Upload CSV file</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Drag and drop your file here or click to browse
          </p>
          <Button size="sm">Choose File</Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Import Preview</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 dark:border-green-500/20">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {validRows} valid
              </Badge>
              {errorRows > 0 && (
                <Badge variant="outline" className="bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 dark:border-red-500/20">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {errorRows} errors
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Company</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-foreground">{row.name}</td>
                    <td className="py-2 text-foreground">{row.email}</td>
                    <td className="py-2 text-foreground">{row.company}</td>
                    <td className="py-2">
                      {row.status === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm">Cancel</Button>
            <Button size="sm">Import {validRows} Contacts</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
