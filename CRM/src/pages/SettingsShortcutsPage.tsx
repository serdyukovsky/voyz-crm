import { Link } from "react-router-dom"
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Command } from 'lucide-react'

const shortcuts = [
  {
    category: "General",
    items: [
      { keys: ["⌘", "K"], description: "Quick search" },
      { keys: ["⌘", "N"], description: "New deal" },
      { keys: ["⌘", "T"], description: "New task" },
      { keys: ["⌘", ","], description: "Open settings" },
    ]
  },
  {
    category: "Navigation",
    items: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "P"], description: "Go to Deals (Pipeline)" },
      { keys: ["G", "T"], description: "Go to Tasks" },
      { keys: ["G", "A"], description: "Go to Analytics" },
    ]
  },
  {
    category: "Actions",
    items: [
      { keys: ["⌘", "Enter"], description: "Save & close" },
      { keys: ["⌘", "S"], description: "Save" },
      { keys: ["Esc"], description: "Close modal" },
      { keys: ["⌘", "/"], description: "Show shortcuts" },
    ]
  },
  {
    category: "Deals",
    items: [
      { keys: ["J"], description: "Next deal" },
      { keys: ["K"], description: "Previous deal" },
      { keys: ["E"], description: "Edit deal" },
      { keys: ["C"], description: "Add comment" },
    ]
  }
]

export default function ShortcutsPage() {
  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Keyboard Shortcuts</h1>
            <p className="text-sm text-muted-foreground">Learn shortcuts to navigate faster</p>
          </div>
        </div>

        <div className="max-w-3xl space-y-6">
          {shortcuts.map((section) => (
            <Card key={section.category} className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{section.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((shortcut, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <div key={keyIdx} className="flex items-center gap-1">
                            {keyIdx > 0 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                            <kbd className="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
                              {key === "⌘" ? (
                                <Command className="h-3 w-3" />
                              ) : (
                                key
                              )}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-border bg-card border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pro Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Press <kbd className="mx-1 inline-flex h-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium">⌘</kbd> + <kbd className="mx-1 inline-flex h-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium">/</kbd> at any time to see this list of shortcuts.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CRMLayout>
  )
}

