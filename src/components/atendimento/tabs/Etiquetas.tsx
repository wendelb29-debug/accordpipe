import { useState } from "react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockLabels } from "../mock-data";

export function Etiquetas() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Etiquetas</h2>
          <p className="text-sm text-muted-foreground">Organize seus contatos com etiquetas</p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Nova Etiqueta
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockLabels.map((label) => (
          <Card key={label.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: label.color + "20" }}>
                    <Tag className="h-4 w-4" style={{ color: label.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label.name}</p>
                    <p className="text-xs text-muted-foreground">{label.count} contatos</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
